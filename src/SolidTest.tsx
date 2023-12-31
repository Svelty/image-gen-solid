import { Component } from "solid-js";

const SolidTest: Component<{}> = (props) => {

  const name = "Image Gen";
  const style = { "background-color": "#2c4f7c", color: "#FFF" };
  
  return <div style={style}>Hello {name}</div>;
};

export default SolidTest;