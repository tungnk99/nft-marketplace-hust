
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { NFTProvider } from "./contexts/NFTContext";
import Layout from "./components/Layout";
import Marketplace from "./pages/Marketplace";
import MyNFTs from "./pages/MyNFTs";
import NFTDetail from "./pages/NFTDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <NFTProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Marketplace />} />
              <Route path="my-nfts" element={<MyNFTs />} />
              <Route path="nft/:id" element={<NFTDetail />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </NFTProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
