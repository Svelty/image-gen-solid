import { Component, JSX } from "solid-js";

type InputProps = JSX.InputHTMLAttributes<HTMLInputElement> & {
    
    children?: JSX.Element;
};

const Input: Component<InputProps> = (props) => {
  
    return <input
            class="bg-zinc-600 rounded p-2 border border-zinc-800 w-full focus:outline-none focus:ring-2 focus:ring-zinc-500"
            {...props}
        >
            {props.children}
        </input>;
};

export default Input;