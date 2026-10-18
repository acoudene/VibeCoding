import { useRoute } from "./navigation";
import { BoardPage } from "./pages/BoardPage";
import { Home } from "./pages/Home";

export function App() {
  const route = useRoute();
  switch (route.page) {
    case "home":
      return <Home />;
    case "board":
      return <BoardPage key={route.id} id={route.id} />;
    case "notFound":
      return (
        <main>
          <h1>Page introuvable</h1>
          <a href="/">Accueil</a>
        </main>
      );
  }
}
