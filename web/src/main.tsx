import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Layout } from "@/components/Layout"
import { CharacterListPage } from "@/pages/CharacterListPage"
import { CharacterDetailPage } from "@/pages/CharacterDetailPage"
import "@/globals.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TooltipProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<CharacterListPage />} />
            <Route path="/characters/:id" element={<CharacterDetailPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </React.StrictMode>
)
