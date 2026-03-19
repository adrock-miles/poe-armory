package poe_client

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/poe-armory/poe-armory/internal/domain/model"
)

// Realm defines a PoE realm with its host and profile URL path.
type Realm struct {
	Label      string
	RealmCode  string
	HostName   string
	ProfileURL string
}

// Standard realms matching Path of Building's realmList.
var (
	RealmPC = Realm{
		Label:      "PC",
		RealmCode:  "pc",
		HostName:   "https://www.pathofexile.com/",
		ProfileURL: "account/view-profile/",
	}
	RealmXbox = Realm{
		Label:      "Xbox",
		RealmCode:  "xbox",
		HostName:   "https://www.pathofexile.com/",
		ProfileURL: "account/xbox/view-profile/",
	}
	RealmPS4 = Realm{
		Label:      "PS4",
		RealmCode:  "sony",
		HostName:   "https://www.pathofexile.com/",
		ProfileURL: "account/sony/view-profile/",
	}
)

// Client communicates with the PoE public character-window API.
// Follows the same endpoints as Path of Building's ImportTab.lua.
type Client struct {
	httpClient *http.Client
	userAgent  string
	realm      Realm
}

func New(userAgent string, realm Realm) *Client {
	return &Client{
		httpClient: &http.Client{Timeout: 30 * time.Second},
		userAgent:  userAgent,
		realm:      realm,
	}
}

func (c *Client) doRequest(ctx context.Context, path string, params url.Values) ([]byte, error) {
	fullURL := c.realm.HostName + path
	if params != nil {
		fullURL += "?" + params.Encode()
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, fullURL, nil)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}

	req.Header.Set("User-Agent", c.userAgent)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("executing request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading response: %w", err)
	}

	switch resp.StatusCode {
	case http.StatusOK:
		return body, nil
	case http.StatusForbidden:
		return nil, fmt.Errorf("account profile is private — the profile must be set to public on pathofexile.com")
	case http.StatusNotFound:
		return nil, fmt.Errorf("account not found")
	default:
		return nil, fmt.Errorf("PoE API returned status %d: %s", resp.StatusCode, string(body))
	}
}

// poeCharacter is the raw API response structure for a character.
type poeCharacter struct {
	Name       string `json:"name"`
	League     string `json:"league"`
	ClassID    int    `json:"classId"`
	Class      string `json:"class"`
	Level      int    `json:"level"`
	Experience int64  `json:"experience"`
}

// GetCharacters fetches all characters for a public account.
// Endpoint: {hostName}character-window/get-characters?accountName={name}&realm={code}
func (c *Client) GetCharacters(ctx context.Context, accountName string) ([]model.Character, error) {
	// PoB: for PC realm, strip all spaces from account name
	cleanName := accountName
	if c.realm.RealmCode == "pc" {
		cleanName = strings.ReplaceAll(cleanName, " ", "")
	} else {
		cleanName = strings.TrimSpace(cleanName)
		cleanName = strings.ReplaceAll(cleanName, " ", "+")
	}

	params := url.Values{
		"accountName": {cleanName},
		"realm":       {c.realm.RealmCode},
	}
	body, err := c.doRequest(ctx, "character-window/get-characters", params)
	if err != nil {
		return nil, err
	}

	var raw []poeCharacter
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, fmt.Errorf("parsing characters: %w", err)
	}

	chars := make([]model.Character, len(raw))
	for i, r := range raw {
		ascendancy := ""
		class := r.Class
		if isAscendancy(r.Class) {
			ascendancy = r.Class
			class = baseClassForAscendancy(r.Class)
		}
		chars[i] = model.Character{
			Name:        r.Name,
			League:      r.League,
			ClassID:     r.ClassID,
			Class:       class,
			Ascendancy:  ascendancy,
			Level:       r.Level,
			Experience:  r.Experience,
			AccountName: accountName,
		}
	}
	return chars, nil
}

// poeItemsResponse is the raw response from get-items.
type poeItemsResponse struct {
	Items     []json.RawMessage `json:"items"`
	Character poeCharacter      `json:"character"`
}

type poeRawItem struct {
	Name          string               `json:"name"`
	TypeLine      string               `json:"typeLine"`
	BaseType      string               `json:"baseType"`
	FrameType     int                  `json:"frameType"`
	InventoryId   string               `json:"inventoryId"`
	Icon          string               `json:"icon"`
	Ilvl          int                  `json:"ilvl"`
	Identified    bool                 `json:"identified"`
	Corrupted     bool                 `json:"corrupted"`
	Sockets       []model.Socket       `json:"sockets"`
	SocketedItems []json.RawMessage    `json:"socketedItems"`
	ImplicitMods  []string             `json:"implicitMods"`
	ExplicitMods  []string             `json:"explicitMods"`
	CraftedMods   []string             `json:"craftedMods"`
	EnchantMods   []string             `json:"enchantMods"`
	FracturedMods []string             `json:"fracturedMods"`
	Properties    []model.ItemProperty `json:"properties"`
}

type poeRawGem struct {
	Name     string `json:"name,omitempty"`
	TypeLine string `json:"typeLine"`
	Icon     string `json:"icon"`
	Support  bool   `json:"support"`
	Properties []struct {
		Name   string          `json:"name"`
		Values [][]interface{} `json:"values"`
	} `json:"properties"`
}

// GetItems fetches equipped items and socketed gems for a character.
// Endpoint: {hostName}character-window/get-items?accountName={name}&character={charName}&realm={code}
func (c *Client) GetItems(ctx context.Context, accountName, characterName string) ([]model.Item, []model.Gem, error) {
	params := url.Values{
		"accountName": {accountName},
		"character":   {characterName},
		"realm":       {c.realm.RealmCode},
	}
	body, err := c.doRequest(ctx, "character-window/get-items", params)
	if err != nil {
		return nil, nil, err
	}

	var resp poeItemsResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, nil, fmt.Errorf("parsing items response: %w", err)
	}

	var items []model.Item
	var gems []model.Gem

	for _, rawJSON := range resp.Items {
		var raw poeRawItem
		if err := json.Unmarshal(rawJSON, &raw); err != nil {
			continue
		}

		item := model.Item{
			Name:       raw.Name,
			TypeLine:   raw.TypeLine,
			BaseType:   raw.BaseType,
			FrameType:  raw.FrameType,
			Slot:       raw.InventoryId,
			IconURL:    raw.Icon,
			Ilvl:       raw.Ilvl,
			Identified: raw.Identified,
			Corrupted:  raw.Corrupted,
			Sockets:    raw.Sockets,
			Properties: raw.Properties,
			Mods: model.ItemMods{
				Implicit:  raw.ImplicitMods,
				Explicit:  raw.ExplicitMods,
				Crafted:   raw.CraftedMods,
				Enchant:   raw.EnchantMods,
				Fractured: raw.FracturedMods,
			},
			RawJSON: string(rawJSON),
		}
		items = append(items, item)

		// Extract socketed gems from this item
		for si, socketedRaw := range raw.SocketedItems {
			var rawGem poeRawGem
			if err := json.Unmarshal(socketedRaw, &rawGem); err != nil {
				continue
			}

			gemLevel, gemQuality := parseGemProperties(rawGem.Properties)
			gemName := rawGem.TypeLine
			if rawGem.Name != "" {
				gemName = rawGem.Name
			}

			// Determine socket group from the item's socket list
			socketGroup := 0
			if si < len(raw.Sockets) {
				socketGroup = raw.Sockets[si].Group
			}

			gem := model.Gem{
				ItemSlot:    raw.InventoryId,
				SocketGroup: socketGroup,
				Name:        gemName,
				TypeLine:    rawGem.TypeLine,
				IconURL:     rawGem.Icon,
				Level:       gemLevel,
				Quality:     gemQuality,
				IsSupport:   rawGem.Support,
				RawJSON:     string(socketedRaw),
			}
			gems = append(gems, gem)
		}
	}

	return items, gems, nil
}

// poePassiveResponse is the raw response from get-passive-skills.
type poePassiveResponse struct {
	Hashes         []int             `json:"hashes"`
	HashesEx       []int             `json:"hashes_ex"`
	MasteryEffects map[string]int    `json:"mastery_effects"`
	Items          []json.RawMessage `json:"items"`
}

// GetPassiveTree fetches the passive skill tree for a character.
// Endpoint: {hostName}character-window/get-passive-skills?accountName={name}&character={charName}&realm={code}
func (c *Client) GetPassiveTree(ctx context.Context, accountName, characterName string) (*model.PassiveTree, error) {
	params := url.Values{
		"accountName": {accountName},
		"character":   {characterName},
		"realm":       {c.realm.RealmCode},
	}
	body, err := c.doRequest(ctx, "character-window/get-passive-skills", params)
	if err != nil {
		return nil, err
	}

	var resp poePassiveResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("parsing passive tree: %w", err)
	}

	allHashes := append(resp.Hashes, resp.HashesEx...)

	// Parse mastery effects — encoded as pairs where lower 16 bits = mastery, upper 16 bits = effect
	var masteries []model.MasteryAlloc
	for nodeStr, effectHash := range resp.MasteryEffects {
		nodeHash, _ := strconv.Atoi(nodeStr)
		masteries = append(masteries, model.MasteryAlloc{
			NodeHash:   nodeHash,
			EffectHash: effectHash,
		})
	}

	// Parse tree jewels
	var jewels []model.TreeJewel
	for _, rawJewel := range resp.Items {
		var j struct {
			Name         string   `json:"name"`
			TypeLine     string   `json:"typeLine"`
			BaseType     string   `json:"baseType"`
			FrameType    int      `json:"frameType"`
			Icon         string   `json:"icon"`
			X            int      `json:"x"`
			ImplicitMods []string `json:"implicitMods"`
			ExplicitMods []string `json:"explicitMods"`
		}
		if err := json.Unmarshal(rawJewel, &j); err == nil {
			jewels = append(jewels, model.TreeJewel{
				NodeHash:     j.X,
				Name:         j.Name,
				TypeLine:     j.TypeLine,
				BaseType:     j.BaseType,
				FrameType:    j.FrameType,
				IconURL:      j.Icon,
				ImplicitMods: j.ImplicitMods,
				ExplicitMods: j.ExplicitMods,
			})
		}
	}

	tree := &model.PassiveTree{
		Hashes:    allHashes,
		Masteries: masteries,
		Jewels:    jewels,
		RawJSON:   string(body),
	}

	return tree, nil
}

func parseGemProperties(props []struct {
	Name   string          `json:"name"`
	Values [][]interface{} `json:"values"`
}) (int, int) {
	level := 1
	quality := 0
	for _, p := range props {
		if len(p.Values) > 0 && len(p.Values[0]) > 0 {
			valStr := fmt.Sprintf("%v", p.Values[0][0])
			val, _ := strconv.Atoi(strings.TrimSuffix(strings.TrimPrefix(valStr, "+"), "%"))
			switch p.Name {
			case "Level":
				level = val
			case "Quality":
				quality = val
			}
		}
	}
	return level, quality
}

var ascendancies = map[string]string{
	"Slayer": "Duelist", "Gladiator": "Duelist", "Champion": "Duelist",
	"Assassin": "Shadow", "Saboteur": "Shadow", "Trickster": "Shadow",
	"Juggernaut": "Marauder", "Berserker": "Marauder", "Chieftain": "Marauder",
	"Deadeye": "Ranger", "Raider": "Ranger", "Pathfinder": "Ranger",
	"Necromancer": "Witch", "Elementalist": "Witch", "Occultist": "Witch",
	"Inquisitor": "Templar", "Hierophant": "Templar", "Guardian": "Templar",
	"Ascendant": "Scion",
}

func isAscendancy(class string) bool {
	_, ok := ascendancies[class]
	return ok
}

func baseClassForAscendancy(asc string) string {
	if base, ok := ascendancies[asc]; ok {
		return base
	}
	return asc
}
