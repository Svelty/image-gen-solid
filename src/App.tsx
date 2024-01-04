import type { Component } from "solid-js";

import logo from "./logo.svg";
import SolidTest from "./SolidTest";
import ImageGen from "./ImageGen";

const App: Component = () => {
  return (
    <div class="flex flex-col">
      <SolidTest class="fixed top-0 w-full" />
      <ImageGen />
    </div>
  );
};

export default App;
