import { createRoot } from "react-dom/client";
import { CreateBoard } from "./application/board/create-board";
import { DeleteSelection } from "./application/board/delete-selection";
import { DrawFrame } from "./application/board/draw-frame";
import { EditFrame } from "./application/board/edit-frame";
import { EditLink } from "./application/board/edit-link";
import { EditSticky } from "./application/board/edit-sticky";
import { LinkStickies } from "./application/board/link-stickies";
import { MoveSticky } from "./application/board/move-sticky";
import { OpenBoard } from "./application/board/open-board";
import { PlaceSticky } from "./application/board/place-sticky";
import { RenameBoard } from "./application/board/rename-board";
import { ForgetRecentBoard } from "./application/recent-boards/forget";
import { ListRecentBoards } from "./application/recent-boards/list";
import { LocalStorageRecentBoards } from "./infrastructure/browser/local-storage-recent-boards";
import { BatchedBoardSync } from "./infrastructure/http/batched-board-sync";
import { HttpBoardGateway } from "./infrastructure/http/http-board-gateway";
import { CryptoIdGenerator } from "./infrastructure/system/crypto-id-generator";
import { SystemClock } from "./infrastructure/system/system-clock";
import { YjsBoardStore } from "./infrastructure/yjs/yjs-board-store";
import { App } from "./presentation/web/App";
import { ServicesProvider, type Services } from "./presentation/web/services";

/** Racine de composition du navigateur (ADR-0017) : adaptateurs Yjs, HTTP et localStorage. */
const baseUrl = window.location.origin;
const gateway = new HttpBoardGateway(baseUrl, (input, init) => fetch(input, init));
const store = new YjsBoardStore(); // BoardStore et BoardHistory : une seule instance pour les deux ports
const recentBoards = new LocalStorageRecentBoards();
const ids = new CryptoIdGenerator();

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
  placeSticky: new PlaceSticky(store, ids),
  editSticky: new EditSticky(store),
  moveSticky: new MoveSticky(store),
  deleteSelection: new DeleteSelection(store),
  linkStickies: new LinkStickies(store, ids),
  editLink: new EditLink(store),
  drawFrame: new DrawFrame(store, ids),
  editFrame: new EditFrame(store),
  currentBoard: () => store.current(),
  onBoardChange: (listener) => store.onUpdate(() => listener()),
};

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(
    <ServicesProvider services={services}>
      <App />
    </ServicesProvider>,
  );
}
