import { Component, For, createEffect, createResource, createSignal, onMount, onCleanup } from "solid-js";
import Button from "./components/Button";
import TextArea from "./components/TextArea";
import Select from "./components/Select";
import Option from "./components/Option";
import Input from "./components/Input";
import CheckBox from "./components/CheckBox";
import DropdownSelect from "./components/ark/DropdownSelect";
import { useElementWidth } from "./utils/layout";

//TODO: get these from server
const MIN_SEED = BigInt(0);
const MAX_SEED = (BigInt(2) ** BigInt(63)) - BigInt(1);

const IMAGE_DISPLAY_SIZE = { height: 224, width: 288 }

const BASE_URL = 'http://localhost:5000'

const generateRandomBigInt = (min: bigint, max: bigint) => {
    const range = max - min + BigInt(1);
    //TODO: i think there is probably an issue here with calling Number(range) as range could be larger than Number.MAX_SAFE_INTEGER
    const bytesNeeded = Math.ceil(Math.log2(Number(range)) / 8);
    let randomNumber;
    do {
        const buffer = new Uint8Array(bytesNeeded);
        window.crypto.getRandomValues(buffer);
        randomNumber = BigInt(0);
        for (let byte of buffer) {
            randomNumber = (randomNumber << BigInt(8)) + BigInt(byte);
        }
        randomNumber %= range;
    } while (randomNumber >= range);
    return min + randomNumber;
}

const ImageGen: Component<{}> = (props) => {

    type ResponseItem = {
        title?: string,
        updateType: string,
        percentage?: string,
        image?: number[][][],
        product?: number[][][],
        products?: number[][][][]
    }

    type Image = {
        imageUrl: string,
        height: number,
        width: number,
        isExpanded: boolean
    }

    enum Mode {
        QUALITY = "Quality",
        SPEED = "Speed",
        EXTREME_SPEED = "Extreme Speed"
    }

    const getModels = async () => {
        const response = await fetch(`${BASE_URL}/models`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return await response.json();
    }

    const getAspectRatios = async () => {
        const response = await fetch(`${BASE_URL}/aspect-ratios`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return await response.json();
    }

    const getStyles = async () => {
        const response = await fetch(`${BASE_URL}/styles`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return await response.json();
    }

    const getDefaultStyles = async () => {
        const response = await fetch(`${BASE_URL}/styles/default`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return await response.json();
    }

    const getLoras = async () => {
        const response = await fetch(`${BASE_URL}/loras`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return await response.json();
    }

    const [models, { refetch: refetchModels }] = createResource(getModels);
    const [aspectRatios, { refetch: refetchAspectRatios }] = createResource(getAspectRatios);
    const [styles, { refetch: refetchStyles }] = createResource(getStyles);
    const [defaultStyles, { refetch: refetchDefaultStyles }] = createResource(getDefaultStyles)
    const [loras, { refetch: refetchLoras }] = createResource(getLoras)


    const [imageGenResponse, setImageGenResponse] = createSignal<ResponseItem>({"updateType": "none", "percentage": "0", "title": "Awaiting input"})
    const [imagePreview, setImagePreview] = createSignal<Image>({ imageUrl: "", height: 0, width: 0, isExpanded: false })
    const [images, setImages] = createSignal<Image[]>([{ imageUrl: "", height: 0, width: 0, isExpanded: false }])

    const [prompt, setPrompt] = createSignal("")
    const [negativePrompt, setNegativePrompt] = createSignal("(embedding:unaestheticXLv31:0.8), low quality, watermark")
    const [isRandomSeed, setIsRandomSeed] = createSignal(true)
    const [seed, setSeed] = createSignal(generateRandomBigInt(MIN_SEED, MAX_SEED).toString())
    const [numberOfImages, setNumberOfImages] = createSignal(2)
    const [isEnablePreviewImages, setIsEnablePreviewImages] = createSignal(true)
    const [mode, setMode] = createSignal(Mode.SPEED)
    const [model, setModel] = createSignal("capabilityXL_v20.safetensors")
    const [refinerModel, setRefinerModel] = createSignal("None")
    const [refinerSwitch, setRefinerSwitch] = createSignal(0.667)
    const [size, setSize] = createSignal("1152×896")
    const [isGenerating, setIsGenerating] = createSignal(false)
    const [selectedStyles, setSelectedStyles] = createSignal<string[]>([])
    const [selectedLoras, setSelectedLoras] = createSignal([{ model: "None", weight: 0},{ model: "None", weight: 0},{ model: "None", weight: 0},{ model: "None", weight: 0},{ model: "None", weight: 0}])

    createEffect(() => {
        if (defaultStyles()) { 
            setSelectedStyles(defaultStyles());
        }
    });


    //TODO: investigate how much of this could be done server side
    const getCanvasDataUrl = (rgbArray: number[][][]) => {
        const height  = rgbArray.length
        const width = rgbArray[0].length
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = width;
        canvas.height = height;
        let imageData = ctx?.createImageData(width, height);
        let data = imageData?.data;

        if (data) {
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const pos = (y * width + x) * 4;
                    const rgb = rgbArray[y][x];
                    data[pos] = rgb[0];     // Red
                    data[pos + 1] = rgb[1]; // Green
                    data[pos + 2] = rgb[2]; // Blue
                    data[pos + 3] = 255;    // Alpha (opacity)
                }
            }
        }
        
        if (ctx && imageData) {
            ctx.putImageData(imageData, 0, 0);
            return { 
                imageUrl: canvas.toDataURL(),
                height,
                width,
                isExpanded: false
            }
        }

        return { 
            imageUrl: '',
            height: 0,
            width: 0,
            isExpanded: false
        }
    }

    const handleImageGenResponseJson = (json: ResponseItem) => {
        try {
                        
            if (json.updateType === 'init') {
                setImageGenResponse(json);
            } else if (json.updateType === 'preview') {
                setImageGenResponse(json);
                if (json.image) {
                    try {
                        // console.log("set image preview for json: ", json)
                        const image = getCanvasDataUrl(json.image)
                        setImagePreview(image)
                    } catch (e) {
                        console.log("Error displaying image: ", e)
                    }
                }
            } else if (json.updateType === 'results') {
                if (json.product) {
                    try {
                        // console.log("set images for json: ", json)
                        performance.mark("set-images-start")
                        const image = getCanvasDataUrl(json.product)
                        setImages(images => [ ...images, image])
                        performance.mark("set-images-end")
                        performance.measure("set-images-time", "set-images-start", "set-images-end")
                    } catch (e) {
                        console.log("Error displaying image: ", e)
                    }
                }
            } else if (json.updateType == 'finished') {
                if (json.products && json.products.length) {
                    json.products.forEach(product => {
                        try {
                            // console.log("set images for json: ", json)
                            performance.mark("set-images-start")
                            const image = getCanvasDataUrl(product)
                            setImages(images => [ ...images, image])
                            performance.mark("set-images-end")
                            performance.measure("set-images-time", "set-images-start", "set-images-end")
                        } catch (e) {
                            console.log("Error displaying image: ", e)
                        }
                    })
                    
                }
                setImageGenResponse(json);
            } else {
                console.log("------ THIS IS UNEXPECTED --------")
            }
        } catch (e) {
            console.log("Wheres the error: ", e)
        }
    }

    const cancelImageGen = async () => {
        try {
            const response = await fetch(
                `http://localhost:5000/image/gen/cancel`
            );
        } catch (e) {
            console.log("Error canceling image generation: ", e)
        }
    }

    const skipCurrentImageGen = async () => {
        try {
            const response = await fetch(
                `http://localhost:5000/image/gen/skip`
            );
        } catch (e) {
            console.log("Error skiping image generation: ", e)
        }
    }
    
    //TODO: seems to fail with 1 image
    const genImage = async ({ 
        prompt,
        negativePrompt,
        seed,
        mode,
        numberOfImages,
        isEnablePreviewImages,
        model,
        refinerModel,
        refinerSwitch,
        size,
        styles,
        loras
    }: {
        prompt: string,
        negativePrompt: string,
        seed: string, //TODO: validate that seed is a bigint
        mode: Mode,
        numberOfImages: number,
        isEnablePreviewImages: boolean,
        model: string,
        refinerModel: string,
        refinerSwitch: number,
        size: string,
        styles: string[],
        loras: { model: string, weight: number }[]
    }) => {
        if (isGenerating()) {
            return "Image gen already running"
        }
        //reset images array
        setImages([])
        setImagePreview({ imageUrl: "", height: 0, width: 0, isExpanded: false })
        setIsGenerating(true)
        try {
            console.log(prompt)
            console.log(negativePrompt)
            console.log(seed)
            console.log(mode)
            console.log(numberOfImages)
            console.log(isEnablePreviewImages)
            console.log(model)
            console.log(refinerModel)
            console.log(refinerSwitch)
            console.log(size)
            console.log(styles)
            console.log(loras)
            const postJson = { 
                prompt:prompt, 
                negativePrompt:negativePrompt, 
                baseModelName: model,
                refinerModelName: refinerModel,
                refinerSwitch: refinerSwitch,
                imageSeed: seed, 
                imageNumber: numberOfImages, 
                performanceSelection: mode,
                styleSelections: styles, 
                aspectRatiosSelection: size,
                enablePreviewImages: isEnablePreviewImages,
                loraParameters: loras
            }
            const response = await fetch(
                `http://localhost:5000/image/gen`, ///image/gen
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(postJson)
                }
            );

            // Ensure the server is sending a stream
            if (!response.body) {
                throw new Error('Response is not a stream.');
            }
            const reader = response.body.getReader();

            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    console.log('Stream complete');
                    break;
                }

                buffer += new TextDecoder().decode(value);

                try {
                    // Check if the buffer contains a complete JSON object
                    const json = JSON.parse(buffer);

                    performance.mark("handle-image-gen-response-start")
                    handleImageGenResponseJson(json)
                    performance.mark("handle-image-gen-response-end")
                    performance.measure("image-gen-response-handler-time", "handle-image-gen-response-start", "handle-image-gen-response-end")

                    // Reset the buffer for the next message
                    buffer = '';
                } catch (e) {
                    // The JSON is not complete, so wait for more chunks
                    console.log("Incomplete JSON, waiting for more data...");
                    try {
                        if (buffer.includes("\n\n")) {

                            const splitBuffer = buffer.split("\n\n")

                            const end = splitBuffer.pop()
                            buffer = end ? end : ''

                            splitBuffer.forEach(el => {
                                try {
                                    const json = JSON.parse(el);
                                    performance.mark("handle-image-gen-response-in-error-start")
                                    handleImageGenResponseJson(json)
                                    performance.mark("handle-image-gen-response-in-error-end")
                                    performance.measure("image-gen-response-in-error-handler-time", "handle-image-gen-response-in-error-start", "handle-image-gen-response-in-error-end")
                                } catch (e) {
                                    console.log("could not process: ", el)
                                    console.log("error: ", e)
                                }
                            })
                        }
                    } catch (nestedError) {
                        console.log("NESTED ERROR: ", nestedError)
                    }
                }
            }
            setIsGenerating(false)
            return true
        } catch (error) {
            console.log("error: ", error)
            setIsGenerating(false)
            return false
        } 
    }

    const logPerformance = (name: string) => {
        const perf = performance.getEntriesByName(name)
        console.log(name + ': ', perf)
        console.log(calculateAveragePerformance(perf))
    }

    const calculateAveragePerformance = (measures: PerformanceEntryList) => {
        const totalDuration = measures.reduce((total, measure) => total + measure.duration, 0);
        return measures.length > 0 ? totalDuration / measures.length : 0;
    }

    // const useElementWidth =(): [() => number, (el: HTMLElement) => void]  => {
    //     const [width, setWidth] = createSignal(0);
    //     let elementRef: HTMLElement;
    
    //     const updateWidth = () => setWidth(elementRef.offsetWidth);
    
    //     onMount(() => {
    //         window.addEventListener('resize', updateWidth);
    //         updateWidth(); // Initialize width
    //     });
    
    //     onCleanup(() => {
    //         window.removeEventListener('resize', updateWidth);
    //     });
    
    //     return [() => width(), (el: HTMLElement) => { elementRef = el; }];
    // }

    const [getParentWidth, parentRef] = useElementWidth();

  
  return (
    <div>
        <div class="flex h-screen">
            {/* <div class="flex-auto w-64 p-2 overflow-auto"> */}
            <div class="fixed top-6 left-0 w-64 p-2 overflow-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-zinc-600" style={{ height: 'calc(100vh - 24px)' }}>
                <div>
                    <span>
                        Model:
                    </span>
                    {models.loading 
                        ? (<span> MODELS LOADING </span>) 
                        : (<>
                            <label for="model-dropdown">Choose an model:</label>
                            <Select id="model-dropdown" value={model()} onChange={(e) => setModel(e.target.value)}>
                                {models().map((model: string) => {
                                    return <Option value={model}>{model}</Option>
                                })}
                            </Select>
                        </>)
                    }
                    
                </div>
                <div>
                    <span>
                        Model:
                    </span>
                    {models.loading 
                        ? (<span> MODELS LOADING </span>) 
                        : (<>
                            <label for="refiner-model-dropdown">Choose a refiner:</label>
                            <Select id="refiner-model-dropdown" value={refinerModel()} onChange={(e) => setRefinerModel(e.target.value)}>
                                <Option value={"None"}>None</Option>
                                {}
                            </Select>
                            <DropdownSelect 
                                options={[ {value: "None", label: "None"}, ...models().map((model: string) => {
                                    return { value: model, label: model}
                                })]}
                                onChange={(e) => console.log(e)}
                                label="Choose a refiner model:"
                                defaultSelected={refinerModel()}
                            />
                        </>)
                    }
                </div>
                <div>
                    <span>
                        {"Refiner Switch (< 1): "} 
                    </span>
                    <Input 
                        id="number-of-images"
                        value={refinerSwitch()}
                        onChange={(e) => {
                            setRefinerSwitch(Number(e.currentTarget.value))
                        }}
                    />
                </div>
                <div class="flex">
                    <Button  type="button" onClick={() => refetchModels()}>
                        Refresh Models
                    </Button>
                </div>
                <div>
                    <span>
                        Number of Images: 
                    </span>
                    <Input 
                        id="number-of-images"
                        value={numberOfImages()}
                        onChange={(e) => {
                            setNumberOfImages(Number(e.currentTarget.value))
                        }}
                    />
                </div>
                <div>
                    <span>
                        Randomise Seed:
                    </span>
                    <input 
                        type="checkbox" 
                        id="is-random-seed" 
                        checked={isRandomSeed()}
                        onChange={(e) => {
                            setIsRandomSeed(e.target.checked)
                            if (e.target.checked) {
                                setSeed(generateRandomBigInt(MIN_SEED, MAX_SEED).toString())
                            }
                        }}
                    />
                </div>
                <div>
                    <span>
                        Seed: 
                    </span>
                    <Input 
                        id="seed"
                        value={seed()}
                        onChange={(e) => {
                            setSeed(e.currentTarget.value)
                        }}
                    />
                </div>
                <div>
                    <span>
                        Enable Preview Images:
                    </span>
                    <input 
                        type="checkbox" 
                        id="is-enable-preview-images" 
                        checked={isEnablePreviewImages()}
                        onChange={(e) => {
                            setIsEnablePreviewImages(e.target.checked)
                        }}
                    />
                </div>
                <div>
                    <span>
                        Mode: 
                    </span>
                    {Object.entries(Mode).map((entry, index) => {
                        return (<>
                            <input 
                                type="radio"
                                id={`mode-${index}`}
                                name="mode-radio"
                                value={entry[1]}
                                checked={mode() === entry[1]}
                                onChange={() => setMode(entry[1])}
                            />
                            <label for={entry[1]}>{entry[1]}</label>
                            {index < Object.entries(Mode).length && <br/>}
                        </>)
                    })}
                    
                    {/* <RadioGroup<Mode> 
                        title="Mode"
                        options={Object.entries(Mode).map((entry) =>{ 
                            return {
                                label: entry[1],
                                value: entry[1],
                                data: entry[1]
                            }
                        })}
                        defaultValue={mode()}
                        onChange={({ label, value, data }) => {
                            setMode(data)
                        }}
                    /> */}
                </div>
                <div>
                    <span>
                        Image Size:
                    </span>
                    {aspectRatios.loading 
                        ? (<span> AVAILABLE ASPECT RATIOS LOADING </span>) 
                        : (<>
                            {/* <label for="size-dropdown">Choose a size:</label>
                            <Select id="size-dropdown" value={size()} onChange={(e) => setSize(e.target.value)}>
                                {aspectRatios().map((ratio: { dimensions: string, ratio: string}) => {
                                    return <Option value={ratio.dimensions}>{ratio.dimensions + " " + ratio.ratio}</Option>
                                })}
                            </Select> */}
                            {/* TODO: onFocus, scrollbar, border */}
                            <DropdownSelect 
                                options={aspectRatios().map((ratio: { dimensions: string, ratio: string}) => {
                                    return { value:ratio.dimensions, label:ratio.dimensions + " " + ratio.ratio }
                                })}
                                onChange={(e) => setSize(e[0].value)}
                                label="Choose a size:"
                                defaultSelected={size()}
                            />
                        </>)
                    }
                </div>
                {/* TODO: move button next to prompt */}
                

                <div>
                    <span>
                        Lora Config:
                    </span>
                    {loras.loading 
                        ? (<span> LORAS LOADING </span>) 
                        : (<>
                            <For each={selectedLoras()}>{(item, index) => {
                                return (<div>
                                    <label for="lora-dropdown">Lora {index() + 1}:</label>
                                    <Select 
                                        class="mb-1"
                                        id="lora-model-dropdown" 
                                        value={item.model} 
                                        //@ts-ignore TODO:
                                        onChange={(e) => setSelectedLoras(selected => {
                                            selected[index()] = { model: e.target.value, weight: selected[index()].weight }
                                            return selected
                                        })
                                    }>
                                        <Option value={"None"}>None</Option>
                                        {loras().map((lora: string) => {
                                            return (<>
                                                <Option value={lora}>{lora}</Option>
                                                
                                            </>)
                                        })}
                                    </Select>
                                    <Input
                                        value={item.weight}
                                        onChange={(e) => {
                                            //@ts-ignore
                                            setSelectedLoras(selected => {
                                                selected[index()] = { model: selected[index()].model, weight: Number(e.currentTarget.value) }
                                                return selected
                                            })
                                        }}
                                    ></Input>
                                </div>)
                            }
                                
                            }</For>
                            
                        </>)
                    }
                </div>
                <div>
                    <Button type="button" onClick={() => refetchLoras()}>
                        Refresh Loras
                    </Button>
                </div>

                <div>
                    <span>
                        Styles:
                    </span>
                    {styles.loading 
                        ? <span> STYLES LOADING</span>
                        :
                        (<div class="flex flex-wrap">{styles().map((style: string, index: number) => {
                            return (<div class="w-full">
                                <CheckBox 
                                    type="checkbox"
                                    id={style} 
                                    value={style} 
                                    checked={selectedStyles().includes(style)}
                                    
                                    onChange={() => {
                                        setSelectedStyles((prev) => {
                                            if (prev.includes(style)) {
                                                // Remove the Option if it's already in the array
                                                return prev.filter(item => item !== style);
                                            } else {
                                                // Add the Option if it's not in the array
                                                return [...prev, style];
                                            }
                                        });
                                    }}
                                />
                                {/* {index != 0 && index % 3 == 0 ? <br /> : <></> } */}
                            </div>)
            
                        })}</div>)
                    }
                </div>
            </div>
                

            <div ref={parentRef} class="ml-64 flex-auto relative">
                <div class="fixed top-0 right-0 bg-zinc-700 z-10" style={{ width: `${getParentWidth()}px` }}>
                    <div class="flex p-1 mt-2">
                        <div class="w-2/5 m-1 mb-0">
                            <span>
                                Prompt: 
                            </span>
                            <TextArea
                                id="prompt"
                                value={prompt()}
                                onInput={(e) => {
                                    setPrompt(e.currentTarget.value);
                                }}
                                class="h-28"
                            />
                        </div>
                        <div class="w-2/5 m-1 mb-0">
                            <span>
                                Negative Prompt:
                            </span>
                            <TextArea
                                id="negative-prompt"
                                value={negativePrompt()}
                                onInput={(e) => {
                                    setNegativePrompt(e.currentTarget.value);
                                }}
                                class="h-28"
                            />
                        </div>
                        <div class="relative w-1/5 p-1 h-36">
                            <div>
                                <div>{imageGenResponse().percentage}</div>
                                <div>{imageGenResponse().updateType}</div>
                                <div>{imageGenResponse().title}</div>
                            </div>
                            <div class="absolute bottom-0 right-0">
                                {!isGenerating() 
                                    && 
                                    <Button 
                                        type="button"
                                        onClick={async (e) => {
                                            e.preventDefault();
                                            performance.mark("gen-image-start")
                                            const isSuccess = await genImage({
                                                prompt: prompt(),
                                                negativePrompt: negativePrompt(),
                                                seed: seed(),
                                                mode: mode(),
                                                numberOfImages: numberOfImages(),
                                                isEnablePreviewImages: isEnablePreviewImages(),
                                                model: model(),
                                                refinerModel: refinerModel(),
                                                refinerSwitch: refinerSwitch(),
                                                size: size(),
                                                styles: selectedStyles(),
                                                loras: selectedLoras()
                                            });
                                            performance.mark("gen-image-end")
                                            performance.measure("gen-image-time", "gen-image-start", "gen-image-end")
                                            if (isSuccess && isRandomSeed()) {
                                                setSeed(generateRandomBigInt(MIN_SEED, MAX_SEED).toString())
                                            }
                                        }}
                                    >
                                        Generate
                                    </Button>
                                }
                                {isGenerating() 
                                && 
                                    <>
                                        <Button type="button" onClick={() => cancelImageGen()}>
                                            Cancel
                                        </Button>
                                        <Button type="button" onClick={() => skipCurrentImageGen()}>
                                            Skip
                                        </Button>
                                    </>
                                }
                            </div>
                        </div>
                        
                    </div>
                    
                </div>
                

                <div class="mt-41 pl-1 pr-2 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-zinc-600" style={{ height: 'calc(100vh - 162px)' }}>
                
                    {isEnablePreviewImages() && isGenerating()
                        && <div>
                                <img 
                                    class="m-1"
                                    src={imagePreview().imageUrl} 
                                    alt="Preview" 
                                    height={imagePreview().height}
                                    width={imagePreview().width}
                                />
                            </div>
                    }
                    <div>
                        {images().map((image, index) => {
                            const heightRatio = image.width / IMAGE_DISPLAY_SIZE.width
                            const widthRatio = image.height / IMAGE_DISPLAY_SIZE.height
                            let adjust = heightRatio >= widthRatio ? heightRatio : widthRatio
                            // TODO: think more about this
                            return (
                                <img 
                                    class="m-1"
                                    src={image.imageUrl} 
                                    alt={`Image ${index}`} 
                                    height={image.isExpanded ? image.height : image.height / adjust} 
                                    width={image.isExpanded ? image.width : image.width / adjust}
                                    onClick={(e ) => {
                                        const targetImage = e.target as HTMLImageElement
                                        if (image.isExpanded) {
                                            targetImage.height = image.height / adjust
                                            targetImage.width = image.width / adjust
                                            image.isExpanded = false
                                        } else {
                                            targetImage.height = image.height
                                            targetImage.width = image.width
                                            image.isExpanded = true
                                        }
                                    }}
                                />
                            )
                        })}
                    </div>
                    {/* <div class="flex justify-end"> */}
                    <div class="fixed bottom-0 right-0 p-2">
                        <div>
                            <Button
                                type="button"
                                onClick={() => {
                                    logPerformance("gen-image-time")
                                    logPerformance("image-gen-response-handler-time")
                                    logPerformance("image-gen-response-in-error-handler-time")
                                    logPerformance("set-images-time")
                                    
                                }}
                            >
                                Output Metrics to Console
                            </Button>
                            <Button
                                type="button"
                                onClick={() => {
                                    performance.clearMarks()
                                    performance.clearMeasures()
                                    
                                }}
                            >
                                Clear Metrics
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>);
};

export default ImageGen;









//if streaming proves to be too resource intensive this can be used to fetch just the final image
// const genImage2 = async (body: string) => {
    //     try {
    //         console.log(body)
    //         const postJson = { "prompt":"1girl", "negativePrompt":"(embedding:unaestheticXLv31:0.8), low quality, watermark", "baseModelName":"capabilityXL_v20.safetensors", "imageSeed":"4891906240077778569", "imageNumber":1, "performanceSelection":"Quality", "styleSelections":["Fooocus V2", "Fooocus Masterpiece", "SAI Anime"], "aspectRatiosSelection":"1152×896" }
    //         const response = await fetch(
    //             `http://localhost:5000/image/gen/2`, ///image/gen
    //             {
    //                 method: 'POST',
    //                 headers: {
    //                     'Content-Type': 'application/json'
    //                 },
    //                 body: JSON.stringify(postJson)
    //             }
    //         );

    //         console.log(response)
    //         const resJson = await response.json()
    //         console.log(resJson)
    //         console.log(resJson[0])

    //         const rgbArray = resJson[0]
            
    //         const height  = 896
    //         const width = 1152
    //         const canvas = document.createElement('canvas');
    //         const ctx = canvas.getContext('2d');
    //         canvas.width = width;
    //         canvas.height = height;
    //         let imageData = ctx?.createImageData(width, height);
    //         let data = imageData?.data;

    //         if (data) {
    //             for (let y = 0; y < height; y++) {
    //                 for (let x = 0; x < width; x++) {
    //                     const pos = (y * width + x) * 4;
    //                     const rgb = rgbArray[y][x];
    //                     data[pos] = rgb[0];     // Red
    //                     data[pos + 1] = rgb[1]; // Green
    //                     data[pos + 2] = rgb[2]; // Blue
    //                     data[pos + 3] = 255;    // Alpha (opacity)
    //                 }
    //             }
    //         }
            
    //         if (ctx && imageData) {
    //             ctx.putImageData(imageData, 0, 0);
    //         setImage(canvas.toDataURL());
    //         }
            

    //     } catch (error) {
    //         console.log("error: ", error)
    //     }
        
    // }