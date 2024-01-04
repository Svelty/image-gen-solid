import { Select } from "@ark-ui/solid";
import { Component, Index, JSX, createEffect, createSignal } from "solid-js";
import { Portal } from "solid-js/web";
import { useElementWidth } from "../../utils/layout";

type Option = {
    value: any,
    label: string
}

type DropdownSelectProps = {
    
    children?: JSX.Element;
    showClear?: boolean
    showItemGroupLabel?: boolean,
    onChange?: (selected: Option[]) => any,
    options: Option[],
    label: string,
    placeholder?: string,
    defaultSelected: string
};

const DropdownSelect: Component<DropdownSelectProps> = (props) => {
    const { 
        showClear = false,
        showItemGroupLabel = false,
        options,
        onChange,
        label,
        placeholder,
        defaultSelected
    } = props
  
    const [getControlWidth, selectControlRef] = useElementWidth();
    const [isOpen, setIsOpen] = createSignal(false)


  return (
    <Select.Root 
        items={options} 
        onValueChange={(e) => {
            onChange ? onChange(e.items) : null
        }}
        value={[defaultSelected]}
        class="focus:ring-2 focus:ring-zinc-500"
        onOpenChange={(e) => setIsOpen(e.open)}
    >
        <Select.Label class="truncate">{label}</Select.Label>
        <Select.Control ref={selectControlRef} class={`flex bg-zinc-600 rounded p-2 border border-zinc-800 w-full focus:outline-none focus:ring-2 focus:ring-zinc-500`}>
            <Select.Trigger class="flex w-full justify-end">
                <Select.ValueText class="flex-grow text-left truncate" placeholder={placeholder ? placeholder : ''} />
                <Select.Indicator class="">▼</Select.Indicator>
            </Select.Trigger>
            {showClear && <Select.ClearTrigger>Clear</Select.ClearTrigger>}
        </Select.Control>
        {/* <Portal> */} {/* scrollbar-thin width is 8 */}
            <Select.Positioner 
                class={(isOpen() ? "border " : "") + "border-zinc-800 rounded max-h-80 overflow-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-zinc-600"}
                style={`width: ${getControlWidth() - 8}px`}
            > 
                <Select.Content class="rounded" style={`max-width: ${getControlWidth() - 16}px`}>
                <Select.ItemGroup id={label}>
                    {showItemGroupLabel && <Select.ItemGroupLabel for="framework">Frameworks</Select.ItemGroupLabel>}
                    <Index each={options}>
                    {(option) => (
                        <Select.Item item={option().value} class={`bg-zinc-600 border-b border-r pl-1 pr-1 border-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 flex justify-end hover:bg-zinc-800 first:rounded-t last:rounded-b last:border-b-0`}>
                            <Select.ItemText class="flex-grow truncate">{option().label}</Select.ItemText>
                            <Select.ItemIndicator>✓</Select.ItemIndicator>
                        </Select.Item>
                    )}
                    </Index>
                </Select.ItemGroup>
                </Select.Content>
            </Select.Positioner>
        {/* </Portal> */}
    </Select.Root>
  )
};

export default DropdownSelect;