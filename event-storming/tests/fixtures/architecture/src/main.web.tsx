import { now } from "./infrastructure/clock";
import { title } from "./presentation/screen";

export const render = (): void => {
  void now();
  void title;
};
