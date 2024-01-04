import { Component, JSX } from "solid-js";

type TextAreaProps = JSX.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  class?: string;
  children?: JSX.Element;
};

const TextArea: Component<TextAreaProps> = (props) => {
  return (
    <textarea
      {...props}
      class={`bg-zinc-600 rounded p-1 border border-zinc-800 w-full focus:outline-none focus:ring-2 focus:ring-zinc-500 ${props.class}`}
    >
      {props.children}
    </textarea>
  );
};

export default TextArea;
