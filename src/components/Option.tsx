import { Component, JSX } from "solid-js";

type OptionProps = JSX.OptionHTMLAttributes<HTMLOptionElement> & {
    
    children?: JSX.Element;
};

const Option: Component<OptionProps> = (props) => {
  
    return <option 
            {...props}
        >
            {props.children}
        </option>;
};

export default Option;