import { now } from "./infrastructure/clock";
import { title } from "./presentation/screen";

export const boot = (): void => {
  void now();
  void title;
};
