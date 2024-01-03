import { Component, JSX } from "solid-js";

// onClick?: JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent>;
type ButtonProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
    class?: string
    children?: JSX.Element;
};

const Button: Component<ButtonProps> = (props) => {
  
  return <button 
            {...props}
            class={`bg-emerald-700 border-2 border-emerald-700 font-bold py-2 px-4 rounded-md active:bg-emerald-900 active:border-emerald-700 m-1 ${props.class}`}
            
        > 
            {props.children}
        </button>;
    };

export default Button;