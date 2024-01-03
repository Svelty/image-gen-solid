import { Component, Index, JSX } from "solid-js";
import { RadioGroup as ArkRadioGroup } from '@ark-ui/solid'

const RadioGroup: <T extends any>(props: {
    title: string,
    options: {
        label: string,
        value: string,
        data: T
    }[],
    defaultValue?: string,
    onChange?: (details: {label: string, value: string, data: T }) => void
}) => JSX.Element = ({ 
    title,
    options,
    defaultValue,
    onChange
}) => {
  
    const frameworks = ['React', 'Solid', 'Vue']

    return (
        <ArkRadioGroup.Root value={defaultValue} onValueChange={onChange}>
            <ArkRadioGroup.Label>{title}</ArkRadioGroup.Label>
            <ArkRadioGroup.Indicator />
            <Index each={options}>
                {(option) => (
                    <ArkRadioGroup.Item value={option().value}>
                        <ArkRadioGroup.ItemText>{option().label}</ArkRadioGroup.ItemText>
                        <ArkRadioGroup.ItemControl />
                    </ArkRadioGroup.Item>
                )}
            </Index>
        </ArkRadioGroup.Root>
      )
};

export default RadioGroup;