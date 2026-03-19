import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { api } from "@/lib/api"
import type { PublicCharacterData } from "@/types/character"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GearPanel } from "@/components/GearPanel"
import { GemsPanel } from "@/components/GemsPanel"
import { PassiveTreePanel } from "@/components/PassiveTreePanel"
import { ArrowLeft, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function SharedCharacterPage() {
  const { code } = useParams<{ code: string }>()
  const [data, setData] = useState<PublicCharacterData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!code) return
    api.getSharedCharacter(code)
      .then(setData)
      .catch((err) => setError(err.message || "Share link not found or expired"))
      .finally(() => setLoading(false))
  }, [code])

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href)
    alert("Link copied!")
  }

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading shared character...</div>
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{error || "Character not found."}</p>
        <p className="text-sm text-muted-foreground mt-2">Share links expire after 24 hours.</p>
        <Link to="/lookup" className="text-primary hover:underline mt-4 inline-block">
          Look up a character
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link to="/lookup" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="mr-1 h-4 w-4" /> Public Lookup
          </Link>
          <h1 className="text-3xl font-bold">{data.character.name}</h1>
          <div className="flex items-center gap-3 mt-2">
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
        <Button variant="outline" size="sm" onClick={handleCopyLink}>
          <Share2 className="mr-1 h-4 w-4" />
          Copy Link
        </Button>
      </div>

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
    </div>
  )
}
