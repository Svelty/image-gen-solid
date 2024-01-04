import { Component, JSX } from "solid-js";

type SelectProps = JSX.SelectHTMLAttributes<HTMLSelectElement> & {
  class?: string;
  children?: JSX.Element;
};

const Select: Component<SelectProps> = (props) => {
  return (
    <select
      {...props}
      class={`bg-zinc-600 rounded p-2 border border-zinc-800 w-full focus:outline-none focus:ring-2 focus:ring-zinc-500 ${props.class}`}
    >
      {props.children}
    </select>
  );
};

export default Select;
