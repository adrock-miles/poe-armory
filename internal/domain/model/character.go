package model

import "time"

// Character represents the core domain entity for a PoE character.
type Character struct {
	ID          int64     `json:"id"`
	AccountName string    `json:"accountName"`
	Name        string    `json:"name"`
	League      string    `json:"league"`
	ClassID     int       `json:"classId"`
	Class       string    `json:"class"`
	Ascendancy  string    `json:"ascendancy"`
	Level       int       `json:"level"`
	Experience  int64     `json:"experience"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// CharacterFilter holds optional filter criteria for listing characters.
type CharacterFilter struct {
	AccountName string
	League      string
	Class       string
}

// CharacterSnapshot is a versioned point-in-time capture of a character's full state.
type CharacterSnapshot struct {
	ID          int64        `json:"id"`
	CharacterID int64        `json:"characterId"`
	Level       int          `json:"level"`
	Experience  int64        `json:"experience"`
	SnapshotAt  time.Time    `json:"snapshotAt"`
	Items       []Item       `json:"items"`
	Gems        []Gem        `json:"gems"`
	PassiveTree *PassiveTree `json:"passiveTree"`
}

// Item represents an equipped item on a character.
type Item struct {
	ID         int64          `json:"id"`
	SnapshotID int64          `json:"snapshotId"`
	Name       string         `json:"name"`
	TypeLine   string         `json:"typeLine"`
	BaseType   string         `json:"baseType"`
	FrameType  int            `json:"frameType"`
	Slot       string         `json:"slot"`
	IconURL    string         `json:"iconUrl"`
	Ilvl       int            `json:"ilvl"`
	Identified bool           `json:"identified"`
	Corrupted  bool           `json:"corrupted"`
	Sockets    []Socket       `json:"sockets"`
	Properties []ItemProperty `json:"properties"`
	Mods       ItemMods       `json:"mods"`
	RawJSON    string         `json:"-"`
}

// Socket represents a socket on an item.
type Socket struct {
	Group int    `json:"group"`
	Attr  string `json:"attr"`
	Color string `json:"color"`
}

// ItemProperty is a key-value property on an item.
type ItemProperty struct {
	Name   string          `json:"name"`
	Values [][]interface{} `json:"values"`
}

// ItemMods holds the different mod categories on an item.
type ItemMods struct {
	Implicit  []string `json:"implicitMods,omitempty"`
	Explicit  []string `json:"explicitMods,omitempty"`
	Crafted   []string `json:"craftedMods,omitempty"`
	Enchant   []string `json:"enchantMods,omitempty"`
	Fractured []string `json:"fracturedMods,omitempty"`
}

// Gem represents a skill gem socketed in an item.
type Gem struct {
	ID          int64  `json:"id"`
	SnapshotID  int64  `json:"snapshotId"`
	ItemSlot    string `json:"itemSlot"`
	SocketGroup int    `json:"socketGroup"`
	Name        string `json:"name"`
	TypeLine    string `json:"typeLine"`
	IconURL     string `json:"iconUrl"`
	Level       int    `json:"level"`
	Quality     int    `json:"quality"`
	IsSupport   bool   `json:"isSupport"`
	RawJSON     string `json:"-"`
}

// PassiveTree represents a character's passive skill tree allocation.
type PassiveTree struct {
	ID         int64          `json:"id"`
	SnapshotID int64          `json:"snapshotId"`
	Hashes     []int          `json:"hashes"`
	Masteries  []MasteryAlloc `json:"masteries"`
	Keystones  []string       `json:"keystones"`
	Jewels     []TreeJewel    `json:"jewels"`
	RawJSON    string         `json:"-"`
}

// MasteryAlloc represents a mastery node allocation.
type MasteryAlloc struct {
	NodeHash   int    `json:"nodeHash"`
	EffectHash int    `json:"effectHash"`
	Effect     string `json:"effect"`
}

// TreeJewel represents a jewel socketed in the passive tree.
type TreeJewel struct {
	NodeHash int    `json:"nodeHash"`
	ItemID   string `json:"itemId"`
	Name     string `json:"name"`
	TypeLine string `json:"typeLine"`
}

// AscendancyInfo holds parsed ascendancy data.
type AscendancyInfo struct {
	ClassName       string   `json:"className"`
	AscendancyName  string   `json:"ascendancyName"`
	PointsAllocated int      `json:"pointsAllocated"`
	Notables        []string `json:"notables"`
}
