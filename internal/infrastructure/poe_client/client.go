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

const baseURL = "https://www.pathofexile.com"

// Client communicates with the Path of Exile character-window API.
type Client struct {
	httpClient  *http.Client
	sessionID   string
	accessToken string
	userAgent   string
}

func New(sessionID, userAgent string) *Client {
	return &Client{
		httpClient: &http.Client{Timeout: 30 * time.Second},
		sessionID:  sessionID,
		userAgent:  userAgent,
	}
}

func (c *Client) doRequest(ctx context.Context, method, path string, params url.Values) ([]byte, error) {
	var req *http.Request
	var err error

	fullURL := baseURL + path
	if method == http.MethodGet && params != nil {
		fullURL += "?" + params.Encode()
		req, err = http.NewRequestWithContext(ctx, method, fullURL, nil)
	} else if method == http.MethodPost {
		req, err = http.NewRequestWithContext(ctx, method, fullURL, strings.NewReader(params.Encode()))
		if req != nil {
			req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		}
	} else {
		req, err = http.NewRequestWithContext(ctx, method, fullURL, nil)
	}
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}

	req.Header.Set("User-Agent", c.userAgent)
	if c.accessToken != "" {
		req.Header.Set("Authorization", "Bearer "+c.accessToken)
	} else if c.sessionID != "" {
		req.AddCookie(&http.Cookie{Name: "POESESSID", Value: c.sessionID})
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("executing request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("PoE API returned status %d: %s", resp.StatusCode, string(body))
	}

	return body, nil
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

func (c *Client) GetCharacters(ctx context.Context, accountName string) ([]model.Character, error) {
	params := url.Values{"accountName": {accountName}}
	body, err := c.doRequest(ctx, http.MethodGet, "/character-window/get-characters", params)
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
		// PoE returns the ascendancy as the class name if ascended
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
	Name            string            `json:"name"`
	TypeLine        string            `json:"typeLine"`
	BaseType        string            `json:"baseType"`
	FrameType       int               `json:"frameType"`
	InventoryId     string            `json:"inventoryId"`
	Icon            string            `json:"icon"`
	Ilvl            int               `json:"ilvl"`
	Identified      bool              `json:"identified"`
	Corrupted       bool              `json:"corrupted"`
	Sockets         []model.Socket    `json:"sockets"`
	SocketedItems   []json.RawMessage `json:"socketedItems"`
	ImplicitMods    []string          `json:"implicitMods"`
	ExplicitMods    []string          `json:"explicitMods"`
	CraftedMods     []string          `json:"craftedMods"`
	EnchantMods     []string          `json:"enchantMods"`
	FracturedMods   []string          `json:"fracturedMods"`
	Properties      []model.ItemProperty `json:"properties"`
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

func (c *Client) GetItems(ctx context.Context, accountName, characterName string) ([]model.Item, []model.Gem, error) {
	params := url.Values{
		"accountName": {accountName},
		"character":   {characterName},
	}
	body, err := c.doRequest(ctx, http.MethodGet, "/character-window/get-items", params)
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

		// Extract socketed gems
		for _, socketedRaw := range raw.SocketedItems {
			var rawGem poeRawGem
			if err := json.Unmarshal(socketedRaw, &rawGem); err != nil {
				continue
			}

			gemLevel, gemQuality := parseGemProperties(rawGem.Properties)
			gemName := rawGem.TypeLine
			if rawGem.Name != "" {
				gemName = rawGem.Name
			}

			gem := model.Gem{
				ItemSlot:    raw.InventoryId,
				SocketGroup: 0,
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

type poePassiveResponse struct {
	Hashes          []int             `json:"hashes"`
	HashesEx        []int             `json:"hashes_ex"`
	MasteryEffects  map[string]int    `json:"mastery_effects"`
	Items           []json.RawMessage `json:"items"`
}

func (c *Client) GetPassiveTree(ctx context.Context, accountName, characterName string) (*model.PassiveTree, error) {
	params := url.Values{
		"accountName": {accountName},
		"character":   {characterName},
		"reqData":     {"0"},
	}
	body, err := c.doRequest(ctx, http.MethodGet, "/character-window/get-passive-skills", params)
	if err != nil {
		return nil, err
	}

	var resp poePassiveResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("parsing passive tree: %w", err)
	}

	allHashes := append(resp.Hashes, resp.HashesEx...)

	var masteries []model.MasteryAlloc
	for nodeStr, effectHash := range resp.MasteryEffects {
		nodeHash, _ := strconv.Atoi(nodeStr)
		masteries = append(masteries, model.MasteryAlloc{
			NodeHash:   nodeHash,
			EffectHash: effectHash,
		})
	}

	var jewels []model.TreeJewel
	for _, rawJewel := range resp.Items {
		var j struct {
			Name     string `json:"name"`
			TypeLine string `json:"typeLine"`
			X        int    `json:"x"`
		}
		if err := json.Unmarshal(rawJewel, &j); err == nil {
			jewels = append(jewels, model.TreeJewel{
				NodeHash: j.X,
				Name:     j.Name,
				TypeLine: j.TypeLine,
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
