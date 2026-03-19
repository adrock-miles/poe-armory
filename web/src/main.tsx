import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthProvider } from "@/hooks/useAuth"
import { Layout } from "@/components/Layout"
import { CharacterListPage } from "@/pages/CharacterListPage"
import { CharacterDetailPage } from "@/pages/CharacterDetailPage"
import { PublicLookupPage } from "@/pages/PublicLookupPage"
import { SharedCharacterPage } from "@/pages/SharedCharacterPage"
import "@/globals.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TooltipProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<CharacterListPage />} />
              <Route path="/characters/:id" element={<CharacterDetailPage />} />
              <Route path="/lookup" element={<PublicLookupPage />} />
              <Route path="/share/:code" element={<SharedCharacterPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </React.StrictMode>
)
