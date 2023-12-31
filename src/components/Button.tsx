import { Component, JSX } from "solid-js";

type ButtonProps = {
    onClick?: JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent>;
    children?: JSX.Element;
};

const Button: Component<ButtonProps> = ({
    onClick,
    ...rest
}) => {
  
  return <button onClick={onClick && onClick} {...rest}></button>;
};

export default Button;