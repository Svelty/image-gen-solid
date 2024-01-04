import { Select } from "@ark-ui/solid";
import { Component, Index, JSX, createEffect, createSignal, onCleanup, onMount } from "solid-js";
import { Portal } from "solid-js/web";
import { useElementWidth } from "../../utils/layout";

type Option = {
    value: any,
    label: string
}

type DropdownSelectProps = {
    class?: string,
    children?: JSX.Element;
    showClear?: boolean
    itemGroupLabel?: string,
    onChange?: (selected: Option[]) => any,
    options: Option[],
    label: string,
    placeholder?: string,
    defaultSelected: string
};

const DropdownSelect: Component<DropdownSelectProps> = (props) => {
    const {
        showClear = false,
        itemGroupLabel,
        options,
        onChange,
        label,
        placeholder,
        defaultSelected,
        class: clasProp
    } = props
  
    const [getControlWidth, selectControlRef] = useElementWidth();
    const [isOpen, setIsOpen] = createSignal(false)
    const [isFocus, setIsFocus] = createSignal(false)

  return (
    <Select.Root 
        items={options} 
        onValueChange={(e) => {
            onChange ? onChange(e.items) : null
        }}
        value={[defaultSelected]}
        onOpenChange={(e) => setIsOpen(e.open)}
        ref={selectControlRef}
        class={clasProp}
    >
        <Select.Label class="truncate">{label}</Select.Label>
        <Select.Control  
            class={`flex bg-zinc-600 rounded p-2 border border-zinc-800 w-full ${isFocus() ? "ring-2 ring-zinc-500" : ""}`}
        >
            <Select.Trigger class="flex w-full justify-end focus:outline-none" 
                onFocus={e => setIsFocus(true)}
                onBlur={e => setIsFocus(false)}
            >
                <Select.ValueText class="flex-grow text-left truncate" placeholder={placeholder ? placeholder : ''} />
                <Select.Indicator class="">▼</Select.Indicator>
            </Select.Trigger>
            {showClear && <Select.ClearTrigger>Clear</Select.ClearTrigger>}
        </Select.Control>
        <Select.Positioner 
            class={(isOpen() ? "border " : "") + "border-zinc-800 rounded max-h-80 overflow-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-zinc-600"}
            style={`width: ${getControlWidth()}px`}
        > 
            {/* scrollbar-thin width is 8, border is 2 */}
            <Select.Content 
                class="rounded" style={`max-width: ${getControlWidth() - 8 - 2}px`}
                onFocus={e => setIsFocus(true)}
                onBlur={e => setIsFocus(false)}
            >
                <Select.ItemGroup id={label}>
                    {/* TODO: have not styed this */}
                    {itemGroupLabel && <Select.ItemGroupLabel for={label}>{itemGroupLabel}</Select.ItemGroupLabel>}
                    <Index each={options}>
                    {(option) => (
                        <Select.Item item={option().value} class={`flex bg-zinc-600 border-b border-r pl-1 pr-1 border-zinc-800 hover:bg-zinc-800 last:border-b-0`}>
                            <Select.ItemText class="flex-grow truncate">{option().label}</Select.ItemText>
                            <Select.ItemIndicator>✓</Select.ItemIndicator>
                        </Select.Item>
                    )}
                    </Index>
                </Select.ItemGroup>
            </Select.Content>
        </Select.Positioner>
    </Select.Root>
  )
};

export default DropdownSelect;