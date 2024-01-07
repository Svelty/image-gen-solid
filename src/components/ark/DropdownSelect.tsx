import { Select, Tooltip } from "@ark-ui/solid";
import {
  Accessor,
  Component,
  Index,
  JSX,
  Show,
  createEffect,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";
import { Portal } from "solid-js/web";
import { useElementWidth } from "../../utils/layout";
import DropdownItemTooltip from "./DropdownItemTooltip";

type Option = {
  value: any;
  label: string;
};

type DropdownSelectProps = {
  class?: string;
  children?: JSX.Element;
  showClear?: boolean;
  itemGroupLabel?: string;
  onChange?: (selected: Option[]) => any;
  options: Option[];
  label: string;
  placeholder?: string;
  defaultSelected: string;
  enableItemToolTips?: boolean;
  enableControlToolTips?: boolean;
};

const DropdownSelect: Component<DropdownSelectProps> = (props) => {
  // const {
  //   showClear = false,
  //   itemGroupLabel,
  //   options,
  //   onChange,
  //   label,
  //   placeholder,
  //   defaultSelected,
  //   class: clasProp,
  // } = props;

  const [getRootWidth, selectRootRef] = useElementWidth();
  const [isOpen, setIsOpen] = createSignal(false);
  const [isFocus, setIsFocus] = createSignal(false);

  const [highlighted, setHighlighted] = createSignal<string | null>(null);

  return (
    <Select.Root
      items={props.options}
      onValueChange={(e) => {
        props.onChange ? props.onChange(e.items) : null;
      }}
      value={[props.defaultSelected]}
      onOpenChange={(e) => setIsOpen(e.open)}
      ref={selectRootRef}
      class={props.class}
      onHighlightChange={(e) => setHighlighted(e.highlightedValue)}
    >
      <Select.Label class="truncate m-1">{props.label}</Select.Label>

      <Select.Control
        class={`flex bg-zinc-600 rounded p-2 border border-zinc-800 w-full ${
          isFocus() ? "ring-2 ring-zinc-500" : ""
        }`}
      >
        {props.enableControlToolTips && (
          <Tooltip.Root
            open={!!highlighted()}
            positioning={{
              placement: "top-start",
              overlap: true,
              // gutter: 0,
              offset: { mainAxis: -24, crossAxis: -100 },
            }}
          >
            <Tooltip.Trigger>
              <></>
            </Tooltip.Trigger>
            <Portal>
              <Tooltip.Positioner>
                <Tooltip.Content class="z-50 bg-zinc-800 pl-1 pr-1 rounded border-zinc-800">
                  {highlighted()}
                </Tooltip.Content>
              </Tooltip.Positioner>
            </Portal>
          </Tooltip.Root>
        )}
        <Select.Trigger
          class="flex w-full justify-end focus:outline-none"
          onFocus={(e) => setIsFocus(true)}
          onBlur={(e) => setIsFocus(false)}
        >
          <Select.ValueText
            class="flex-grow text-left truncate ml-1"
            placeholder={props.placeholder ? props.placeholder : ""}
          />
          <Select.Indicator class="">▼</Select.Indicator>
        </Select.Trigger>
        {props.showClear && <Select.ClearTrigger>Clear</Select.ClearTrigger>}
      </Select.Control>
      <Select.Positioner
        class={
          (isOpen() ? "border " : "") +
          "border-zinc-800 rounded max-h-80 overflow-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-zinc-600"
        }
        style={`width: ${getRootWidth()}px`}
      >
        {/* scrollbar-thin width is 8, border is 2 */}
        <Select.Content
          class="rounded"
          style={`max-width: ${getRootWidth() - 8 - 2}px`}
          onFocus={(e) => setIsFocus(true)}
          onBlur={(e) => setIsFocus(false)}
        >
          <Select.ItemGroup id={props.label}>
            {/* TODO: have not styed this */}
            {props.itemGroupLabel && (
              <Select.ItemGroupLabel for={props.label}>
                {props.itemGroupLabel}
              </Select.ItemGroupLabel>
            )}
            <Index each={props.options}>
              {(option) => (
                <Select.Item
                  item={option().value}
                  class={`flex bg-zinc-600 border-b border-r pl-1 pr-1 border-zinc-800 hover:bg-zinc-800 last:border-b-0`}
                >
                  {(item) => (
                    <>
                      <Select.ItemText class={"flex-grow truncate"}>
                        {option().label}
                      </Select.ItemText>
                      <Select.ItemIndicator>✓</Select.ItemIndicator>
                      {props.enableItemToolTips && (
                        <DropdownItemTooltip show={item().isHighlighted}>
                          <Select.ItemText class="bg-zinc-800 p-1 rounded">
                            {option().label}
                          </Select.ItemText>
                          <Select.ItemIndicator>✓</Select.ItemIndicator>
                        </DropdownItemTooltip>
                      )}
                    </>
                  )}
                </Select.Item>
              )}
            </Index>
          </Select.ItemGroup>
        </Select.Content>
      </Select.Positioner>
    </Select.Root>
  );
};

export default DropdownSelect;
