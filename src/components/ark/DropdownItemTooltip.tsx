import { Tooltip } from "@ark-ui/solid";
import { Component, JSX, createEffect, createSignal } from "solid-js";
import { Portal } from "solid-js/web";

type DropdownItemTooltipProps = {
  show: boolean;
  children?: JSX.Element;
  // content: JSX.Element;
};

const DropdownItemTooltip: Component<DropdownItemTooltipProps> = (props) => {
  // const { show } = props;
  // const [isOpen, setIsOpen] = createSignal(props.show);

  // createEffect(() => {
  //   console.log(props.show);
  //   setIsOpen(props.show);
  // });

  return (
    <>
      {/* <button onClick={() => setIsOpen(!isOpen())}>Toggle</button> */}
      <Tooltip.Root
        open={props.show}
        positioning={{
          placement: "right",
          // overlap: true,
          // gutter: 0,
          offset: { mainAxis: 16, crossAxis: 0 },
        }}
      >
        <Tooltip.Trigger>
          <></>
        </Tooltip.Trigger>
        <Portal>
          <Tooltip.Positioner>
            <Tooltip.Content class="z-50">{props.children}</Tooltip.Content>
          </Tooltip.Positioner>
        </Portal>
      </Tooltip.Root>
    </>
  );
};

export default DropdownItemTooltip;
