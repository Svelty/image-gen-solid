import { Component } from "solid-js";

const SolidTest: Component<{class?: string}> = (props) => {

  const name = "Image Gen";
  
  return <div class={`${props.class}`}>Hello {name}</div>;
};

export default SolidTest;