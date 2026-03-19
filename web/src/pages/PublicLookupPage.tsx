import { useState } from "react"
import { api } from "@/lib/api"
import type { PublicCharacterData } from "@/types/character"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GearPanel } from "@/components/GearPanel"
import { GemsPanel } from "@/components/GemsPanel"
import { PassiveTreePanel } from "@/components/PassiveTreePanel"
import { Search, Share2, ExternalLink } from "lucide-react"

export function PublicLookupPage() {
  const [accountName, setAccountName] = useState("")
  const [characterName, setCharacterName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [data, setData] = useState<PublicCharacterData | null>(null)
  const [shareCode, setShareCode] = useState("")

  async function handleLookup() {
    if (!accountName.trim() || !characterName.trim()) return
    setLoading(true)
    setError("")
    setData(null)
    setShareCode("")

    try {
      const result = await api.lookupPublicCharacter(accountName.trim(), characterName.trim())
      setData(result.data)
      setShareCode(result.shareCode)
    } catch (err: any) {
      setError(err.message || "Failed to look up character. Make sure the account profile is public.")
    } finally {
      setLoading(false)
    }
  }

  function handleCopyShareLink() {
    const url = `${window.location.origin}/share/${shareCode}`
    navigator.clipboard.writeText(url)
    alert("Share link copied to clipboard!")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Public Lookup</h1>
        <p className="text-muted-foreground">
          Look up any public PoE character. No login required.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Look Up Character</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Account Name"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              className="sm:max-w-[250px]"
            />
            <Input
              placeholder="Character Name"
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              className="sm:max-w-[250px]"
            />
            <Button onClick={handleLookup} disabled={loading || !accountName.trim() || !characterName.trim()}>
              <Search className="mr-2 h-4 w-4" />
              {loading ? "Looking up..." : "Look Up"}
            </Button>
          </div>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          <p className="mt-2 text-xs text-muted-foreground">
            The account's profile must be set to public on pathofexile.com.
          </p>
        </CardContent>
      </Card>

      {data && (
        <>
          {/* Character Header */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{data.character.name}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    <Badge variant="outline">Level {data.character.level}</Badge>
                    <Badge variant="secondary">
                      {data.character.ascendancy || data.character.class}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {data.character.league || "Standard"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {data.character.accountName}
                    </span>
                  </div>
                </div>
                {shareCode && (
                  <Button variant="outline" size="sm" onClick={handleCopyShareLink}>
                    <Share2 className="mr-1 h-4 w-4" />
                    Copy Share Link
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tabbed Content */}
          <Tabs defaultValue="gear" className="space-y-4">
            <TabsList>
              <TabsTrigger value="gear">Equipment</TabsTrigger>
              <TabsTrigger value="gems">Gems & Skills</TabsTrigger>
              <TabsTrigger value="tree">Passive Tree</TabsTrigger>
            </TabsList>

            <TabsContent value="gear">
              <GearPanel items={data.items || []} />
            </TabsContent>

            <TabsContent value="gems">
              <GemsPanel gems={data.gems || []} items={data.items || []} />
            </TabsContent>

            <TabsContent value="tree">
              <PassiveTreePanel tree={data.passiveTree} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
