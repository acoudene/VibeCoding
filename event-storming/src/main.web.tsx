import { createRoot } from "react-dom/client";
import { CreateBoard } from "./application/board/create-board";
import { OpenBoard } from "./application/board/open-board";
import { RenameBoard } from "./application/board/rename-board";
import { ForgetRecentBoard } from "./application/recent-boards/forget";
import { ListRecentBoards } from "./application/recent-boards/list";
import { LocalStorageRecentBoards } from "./infrastructure/browser/local-storage-recent-boards";
import { BatchedBoardSync } from "./infrastructure/http/batched-board-sync";
import { HttpBoardGateway } from "./infrastructure/http/http-board-gateway";
import { SystemClock } from "./infrastructure/system/system-clock";
import { YjsBoardStore } from "./infrastructure/yjs/yjs-board-store";
import { App } from "./presentation/web/App";
import { ServicesProvider, type Services } from "./presentation/web/services";

/** Racine de composition du navigateur (ADR-0017) : adaptateurs Yjs, HTTP et localStorage. */
const baseUrl = window.location.origin;
const gateway = new HttpBoardGateway(baseUrl, (input, init) => fetch(input, init));
const store = new YjsBoardStore(); // BoardStore et BoardHistory : une seule instance pour les deux ports
const recentBoards = new LocalStorageRecentBoards();

const services: Services = {
  createBoard: new CreateBoard(gateway),
  openBoard: new OpenBoard(gateway, store, recentBoards, new SystemClock()),
  renameBoard: new RenameBoard(store, recentBoards),
  listRecentBoards: new ListRecentBoards(recentBoards),
  forgetRecentBoard: new ForgetRecentBoard(recentBoards),
  startSync: (id) =>
    new BatchedBoardSync({
      boardId: id,
      store,
      gateway,
      beaconUrl: `${baseUrl}/api/boards/${id}/updates`,
      sendBeacon: (url, data) => navigator.sendBeacon(url, data),
    }),
};

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(
    <ServicesProvider services={services}>
      <App />
    </ServicesProvider>,
  );
}
