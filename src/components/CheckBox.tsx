import { Component, JSX } from "solid-js";

type CheckBoxProps = JSX.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  class?: string;
  children?: JSX.Element;
};

const CheckBox: Component<CheckBoxProps> = (props) => {
  return (
    <>
      <input
        {...props}
        type="checkbox"
        id={props.id}
        class={`bg-zinc-600 rounded border border-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 ${props.class}`}
      >
        {props.children}
      </input>
      <label for={props.id} class="ml-2">
        {props.id}
      </label>
    </>
  );
};

export default CheckBox;
