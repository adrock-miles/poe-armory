package database

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/poe-armory/poe-armory/internal/domain/model"
)

type SQLiteSnapshotRepo struct {
	db *sql.DB
}

func NewSnapshotRepo(db *sql.DB) *SQLiteSnapshotRepo {
	return &SQLiteSnapshotRepo{db: db}
}

func (r *SQLiteSnapshotRepo) Create(ctx context.Context, snapshot *model.CharacterSnapshot) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("beginning transaction: %w", err)
	}
	defer tx.Rollback()

	result, err := tx.ExecContext(ctx, `
		INSERT INTO snapshots (character_id, level, experience, snapshot_at)
		VALUES (?, ?, ?, ?)`,
		snapshot.CharacterID, snapshot.Level, snapshot.Experience, snapshot.SnapshotAt)
	if err != nil {
		return fmt.Errorf("inserting snapshot: %w", err)
	}

	snapshotID, err := result.LastInsertId()
	if err != nil {
		return fmt.Errorf("getting snapshot id: %w", err)
	}
	snapshot.ID = snapshotID

	for i := range snapshot.Items {
		item := &snapshot.Items[i]
		res, err := tx.ExecContext(ctx, `
			INSERT INTO items (snapshot_id, name, type_line, base_type, frame_type, slot, icon_url, ilvl, identified, corrupted, raw_json)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			snapshotID, item.Name, item.TypeLine, item.BaseType, item.FrameType,
			item.Slot, item.IconURL, item.Ilvl, item.Identified, item.Corrupted, item.RawJSON)
		if err != nil {
			return fmt.Errorf("inserting item: %w", err)
		}
		id, _ := res.LastInsertId()
		item.ID = id
		item.SnapshotID = snapshotID
	}

	for i := range snapshot.Gems {
		gem := &snapshot.Gems[i]
		res, err := tx.ExecContext(ctx, `
			INSERT INTO gems (snapshot_id, item_slot, socket_group, name, type_line, icon_url, level, quality, is_support, raw_json)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			snapshotID, gem.ItemSlot, gem.SocketGroup, gem.Name, gem.TypeLine,
			gem.IconURL, gem.Level, gem.Quality, gem.IsSupport, gem.RawJSON)
		if err != nil {
			return fmt.Errorf("inserting gem: %w", err)
		}
		id, _ := res.LastInsertId()
		gem.ID = id
		gem.SnapshotID = snapshotID
	}

	if snapshot.PassiveTree != nil {
		tree := snapshot.PassiveTree
		hashesJSON, _ := json.Marshal(tree.Hashes)
		masteriesJSON, _ := json.Marshal(tree.Masteries)
		keystonesJSON, _ := json.Marshal(tree.Keystones)
		jewelsJSON, _ := json.Marshal(tree.Jewels)

		res, err := tx.ExecContext(ctx, `
			INSERT INTO passive_trees (snapshot_id, hashes_json, masteries_json, keystones_json, jewels_json, raw_json)
			VALUES (?, ?, ?, ?, ?, ?)`,
			snapshotID, string(hashesJSON), string(masteriesJSON), string(keystonesJSON), string(jewelsJSON), tree.RawJSON)
		if err != nil {
			return fmt.Errorf("inserting passive tree: %w", err)
		}
		id, _ := res.LastInsertId()
		tree.ID = id
		tree.SnapshotID = snapshotID
	}

	return tx.Commit()
}

func (r *SQLiteSnapshotRepo) GetByID(ctx context.Context, id int64) (*model.CharacterSnapshot, error) {
	snapshot := &model.CharacterSnapshot{}
	err := r.db.QueryRowContext(ctx, `
		SELECT id, character_id, level, experience, snapshot_at
		FROM snapshots WHERE id = ?`, id).
		Scan(&snapshot.ID, &snapshot.CharacterID, &snapshot.Level, &snapshot.Experience, &snapshot.SnapshotAt)
	if err != nil {
		return nil, err
	}

	if err := r.loadSnapshotRelations(ctx, snapshot); err != nil {
		return nil, err
	}

	return snapshot, nil
}

func (r *SQLiteSnapshotRepo) ListByCharacterID(ctx context.Context, characterID int64) ([]model.CharacterSnapshot, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, character_id, level, experience, snapshot_at
		FROM snapshots WHERE character_id = ? ORDER BY snapshot_at DESC`, characterID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var snapshots []model.CharacterSnapshot
	for rows.Next() {
		var s model.CharacterSnapshot
		if err := rows.Scan(&s.ID, &s.CharacterID, &s.Level, &s.Experience, &s.SnapshotAt); err != nil {
			return nil, err
		}
		snapshots = append(snapshots, s)
	}
	return snapshots, rows.Err()
}

func (r *SQLiteSnapshotRepo) GetLatestByCharacterID(ctx context.Context, characterID int64) (*model.CharacterSnapshot, error) {
	snapshot := &model.CharacterSnapshot{}
	err := r.db.QueryRowContext(ctx, `
		SELECT id, character_id, level, experience, snapshot_at
		FROM snapshots WHERE character_id = ? ORDER BY snapshot_at DESC LIMIT 1`, characterID).
		Scan(&snapshot.ID, &snapshot.CharacterID, &snapshot.Level, &snapshot.Experience, &snapshot.SnapshotAt)
	if err != nil {
		return nil, err
	}

	if err := r.loadSnapshotRelations(ctx, snapshot); err != nil {
		return nil, err
	}

	return snapshot, nil
}

func (r *SQLiteSnapshotRepo) Delete(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM snapshots WHERE id = ?`, id)
	return err
}

func (r *SQLiteSnapshotRepo) GetGearHistory(ctx context.Context, characterID int64, slot string) ([]model.GearHistoryEntry, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT i.id, i.snapshot_id, i.name, i.type_line, i.base_type, i.frame_type,
		       i.slot, i.icon_url, i.ilvl, i.identified, i.corrupted, i.raw_json,
		       s.snapshot_at
		FROM items i
		JOIN snapshots s ON s.id = i.snapshot_id
		WHERE s.character_id = ? AND i.slot = ?
		ORDER BY s.snapshot_at ASC`, characterID, slot)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	type itemRow struct {
		item       model.Item
		snapshotAt time.Time
	}

	var allRows []itemRow
	for rows.Next() {
		var ir itemRow
		if err := rows.Scan(&ir.item.ID, &ir.item.SnapshotID, &ir.item.Name, &ir.item.TypeLine,
			&ir.item.BaseType, &ir.item.FrameType, &ir.item.Slot, &ir.item.IconURL,
			&ir.item.Ilvl, &ir.item.Identified, &ir.item.Corrupted, &ir.item.RawJSON,
			&ir.snapshotAt); err != nil {
			return nil, err
		}
		// Parse mods and sockets from raw JSON
		if ir.item.RawJSON != "" && ir.item.RawJSON != "{}" {
			var raw map[string]json.RawMessage
			if err := json.Unmarshal([]byte(ir.item.RawJSON), &raw); err == nil {
				if v, ok := raw["implicitMods"]; ok {
					json.Unmarshal(v, &ir.item.Mods.Implicit)
				}
				if v, ok := raw["explicitMods"]; ok {
					json.Unmarshal(v, &ir.item.Mods.Explicit)
				}
				if v, ok := raw["craftedMods"]; ok {
					json.Unmarshal(v, &ir.item.Mods.Crafted)
				}
				if v, ok := raw["enchantMods"]; ok {
					json.Unmarshal(v, &ir.item.Mods.Enchant)
				}
				if v, ok := raw["fracturedMods"]; ok {
					json.Unmarshal(v, &ir.item.Mods.Fractured)
				}
				if v, ok := raw["sockets"]; ok {
					json.Unmarshal(v, &ir.item.Sockets)
				}
				if v, ok := raw["properties"]; ok {
					json.Unmarshal(v, &ir.item.Properties)
				}
			}
		}
		allRows = append(allRows, ir)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Deduplicate: only create a new entry when the item fingerprint changes.
	var history []model.GearHistoryEntry
	for _, ir := range allRows {
		fp := itemFingerprint(ir.item)
		if len(history) > 0 && fp == itemFingerprint(history[len(history)-1].Item) {
			// Same item as previous entry — extend its window.
			history[len(history)-1].LastSeenAt = ir.snapshotAt
			history[len(history)-1].SnapshotCount++
		} else {
			history = append(history, model.GearHistoryEntry{
				Item:          ir.item,
				FirstSeenAt:   ir.snapshotAt,
				LastSeenAt:    ir.snapshotAt,
				SnapshotCount: 1,
			})
		}
	}

	// Reverse so newest is first.
	for i, j := 0, len(history)-1; i < j; i, j = i+1, j-1 {
		history[i], history[j] = history[j], history[i]
	}

	return history, nil
}

// itemFingerprint produces a comparable string that uniquely identifies an item's
// "identity" — same name, base, rarity, corruption, and mod set means same item.
func itemFingerprint(item model.Item) string {
	parts := []string{
		item.Name,
		item.TypeLine,
		item.BaseType,
		fmt.Sprintf("%d", item.FrameType),
		fmt.Sprintf("%v", item.Corrupted),
		fmt.Sprintf("%d", item.Ilvl),
	}
	// Include mods so re-crafted / modified items show as different entries.
	appendMods := func(mods []string) {
		sorted := make([]string, len(mods))
		copy(sorted, mods)
		for i := 0; i < len(sorted); i++ {
			for j := i + 1; j < len(sorted); j++ {
				if sorted[i] > sorted[j] {
					sorted[i], sorted[j] = sorted[j], sorted[i]
				}
			}
		}
		for _, m := range sorted {
			parts = append(parts, m)
		}
	}
	appendMods(item.Mods.Implicit)
	appendMods(item.Mods.Explicit)
	appendMods(item.Mods.Crafted)
	appendMods(item.Mods.Enchant)
	appendMods(item.Mods.Fractured)

	result := ""
	for _, p := range parts {
		result += p + "|"
	}
	return result
}

func (r *SQLiteSnapshotRepo) loadSnapshotRelations(ctx context.Context, snapshot *model.CharacterSnapshot) error {
	// Load items
	itemRows, err := r.db.QueryContext(ctx, `
		SELECT id, snapshot_id, name, type_line, base_type, frame_type, slot, icon_url, ilvl, identified, corrupted, raw_json
		FROM items WHERE snapshot_id = ?`, snapshot.ID)
	if err != nil {
		return err
	}
	defer itemRows.Close()

	for itemRows.Next() {
		var item model.Item
		if err := itemRows.Scan(&item.ID, &item.SnapshotID, &item.Name, &item.TypeLine, &item.BaseType,
			&item.FrameType, &item.Slot, &item.IconURL, &item.Ilvl, &item.Identified, &item.Corrupted, &item.RawJSON); err != nil {
			return err
		}
		// Parse mods and sockets from raw JSON
		if item.RawJSON != "" && item.RawJSON != "{}" {
			var raw map[string]json.RawMessage
			if err := json.Unmarshal([]byte(item.RawJSON), &raw); err == nil {
				if v, ok := raw["implicitMods"]; ok {
					json.Unmarshal(v, &item.Mods.Implicit)
				}
				if v, ok := raw["explicitMods"]; ok {
					json.Unmarshal(v, &item.Mods.Explicit)
				}
				if v, ok := raw["craftedMods"]; ok {
					json.Unmarshal(v, &item.Mods.Crafted)
				}
				if v, ok := raw["enchantMods"]; ok {
					json.Unmarshal(v, &item.Mods.Enchant)
				}
				if v, ok := raw["fracturedMods"]; ok {
					json.Unmarshal(v, &item.Mods.Fractured)
				}
				if v, ok := raw["sockets"]; ok {
					json.Unmarshal(v, &item.Sockets)
				}
				if v, ok := raw["properties"]; ok {
					json.Unmarshal(v, &item.Properties)
				}
			}
		}
		snapshot.Items = append(snapshot.Items, item)
	}

	// Load gems
	gemRows, err := r.db.QueryContext(ctx, `
		SELECT id, snapshot_id, item_slot, socket_group, name, type_line, icon_url, level, quality, is_support, raw_json
		FROM gems WHERE snapshot_id = ?`, snapshot.ID)
	if err != nil {
		return err
	}
	defer gemRows.Close()

	for gemRows.Next() {
		var gem model.Gem
		if err := gemRows.Scan(&gem.ID, &gem.SnapshotID, &gem.ItemSlot, &gem.SocketGroup,
			&gem.Name, &gem.TypeLine, &gem.IconURL, &gem.Level, &gem.Quality, &gem.IsSupport, &gem.RawJSON); err != nil {
			return err
		}
		snapshot.Gems = append(snapshot.Gems, gem)
	}

	// Load passive tree
	tree := &model.PassiveTree{}
	var hashesJSON, masteriesJSON, keystonesJSON, jewelsJSON string
	err = r.db.QueryRowContext(ctx, `
		SELECT id, snapshot_id, hashes_json, masteries_json, keystones_json, jewels_json, raw_json
		FROM passive_trees WHERE snapshot_id = ?`, snapshot.ID).
		Scan(&tree.ID, &tree.SnapshotID, &hashesJSON, &masteriesJSON, &keystonesJSON, &jewelsJSON, &tree.RawJSON)
	if err == nil {
		json.Unmarshal([]byte(hashesJSON), &tree.Hashes)
		json.Unmarshal([]byte(masteriesJSON), &tree.Masteries)
		json.Unmarshal([]byte(keystonesJSON), &tree.Keystones)
		json.Unmarshal([]byte(jewelsJSON), &tree.Jewels)
		snapshot.PassiveTree = tree
	}

	return nil
}
