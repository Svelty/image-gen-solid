import { Component, createResource, createSignal } from "solid-js";
import Button from "./components/Button";

//TODO: get these from server
const MIN_SEED = BigInt(0);
const MAX_SEED = (BigInt(2) ** BigInt(63)) - BigInt(1);

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
        product?: number[][][]
    }

    enum Performance {
        QUALITY = "Quality",
        SPEED = "Speed",
        EXTREME_SPEED = "Extreme Speed"
    }

    const [imageGenResponse, setImageGenResponse] = createSignal<ResponseItem>({"updateType": "none", "percentage": "0", "title": "Awaiting input"})
    const [imagePreview, setImagePreview] = createSignal("")
    const [images, setImages] = createSignal([""])

    const [prompt, setPrompt] = createSignal("")
    const [negativePrompt, setNegativePrompt] = createSignal("(embedding:unaestheticXLv31:0.8), low quality, watermark")
    const [isRandomSeed, setIsRandomSeed] = createSignal(true)
    const [seed, setSeed] = createSignal(generateRandomBigInt(MIN_SEED, MAX_SEED).toString())
    const [numberOfImages, setNumberOfImages] = createSignal(2)
    const [isEnablePreviewImages, setIsEnablePreviewImages] = createSignal(false)


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
            return canvas.toDataURL()
        }

        return ""
    }

    const handleImageGenResponseJson = (json: ResponseItem) => {
        try {
                        
            if (json.updateType === 'init') {
                setImageGenResponse(json);
            } else if (json.updateType === 'preview') {
                setImageGenResponse(json);
                if (json.image) {
                    try {
                        console.log("set image preview for json: ", json)
                        const imageUrl = getCanvasDataUrl(json.image)
                        setImagePreview(imageUrl)
                    } catch (e) {
                        console.log("Error displaying image: ", e)
                    }
                }
            } else if (json.updateType === 'results') {
                if (json.product) {
                    try {
                        console.log("set images for json: ", json)
                        const imageUrl = getCanvasDataUrl(json.product)
                        setImages(images => [ ...images, imageUrl])
                    } catch (e) {
                        console.log("Error displaying image: ", e)
                    }
                }
            } else if (json.updateType == 'finished') {
                setImageGenResponse(json);
            } else {
                console.log("------ THIS IS UNEXPECTED --------")
            }
        } catch (e) {
            console.log("Wheres the error: ", e)
        }
    }
    
    const genImage = async ({ 
        prompt,
        negativePrompt,
        seed,
        performance,
        numberOfImages,
        isEnablePreviewImages
    }: {
        prompt: string,
        negativePrompt: string,
        seed: string, //TODO: validate that seed is a bigint
        performance: Performance,
        numberOfImages: number,
        isEnablePreviewImages: boolean
    }) => {
        try {
            console.log(prompt)
            const postJson = { 
                prompt:prompt, 
                negativePrompt:negativePrompt, 
                baseModelName:"capabilityXL_v20.safetensors", 
                imageSeed: seed, 
                imageNumber: numberOfImages, 
                performanceSelection: performance,
                styleSelections:["Fooocus V2", "Fooocus Masterpiece", "SAI Anime"], 
                aspectRatiosSelection:"1152×896",
                enablePreviewImages: isEnablePreviewImages
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

            //reset images array
            setImages([])
            setImagePreview("")

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

                    handleImageGenResponseJson(json)

                    // Reset the buffer for the next message
                    buffer = '';
                } catch (e) {
                    // The JSON is not complete, so wait for more chunks
                    if (e instanceof Error) {
                        console.log("Incomplete JSON, waiting for more data...", e);
                        try {
                            if (buffer.includes("\n\n")) {

                                const splitBuffer = buffer.split("\n\n")

                                const end = splitBuffer.pop()
                                buffer = end ? end : ''

                                splitBuffer.forEach(el => {
                                    try {
                                        const json = JSON.parse(el);
                                        handleImageGenResponseJson(json)
                                    } catch (e) {
                                        console.log("could not process: ", el)
                                        console.log("error: ", e)
                                    }
                                })
                            }
                        } catch (nestedError) {
                            console.log("NESTED ERROR: ", nestedError)
                        }
                    } else {
                        console.log("************************Unexpected error type********************")
                    }
                }
            }
            return true
        } catch (error) {
            console.log("error: ", error)
            return false
        } 
    }

  
  return <div>
    <div>{imageGenResponse().percentage}</div>
    <div>{imageGenResponse().updateType}</div>
    <div>{imageGenResponse().title}</div>
    <img src={imagePreview()} alt="Preview" />
    {images().map((imageUrl, index) => (
        <img src={imageUrl} alt={`Image ${index}`} />
    ))}
    <form
        onSubmit={async (e) => {
            e.preventDefault();
            const isSuccess = await genImage({
                prompt: prompt(),
                negativePrompt: negativePrompt(),
                seed: seed(),
                performance: Performance.SPEED,
                numberOfImages: numberOfImages(),
                isEnablePreviewImages: isEnablePreviewImages()
            });
            if (isSuccess && isRandomSeed()) {
                setSeed(generateRandomBigInt(MIN_SEED, MAX_SEED).toString())
            }
        }}
    >   <div>
            <span>
                Prompt: 
            </span>
            <textarea
                id="prompt"
                value={prompt()}
                onInput={(e) => {
                    setPrompt(e.currentTarget.value);
                }}
            />
        </div>
        <div>
            <span>
                Negative Prompt:
            </span>
            <textarea
                id="negative-prompt"
                value={negativePrompt()}
                onInput={(e) => {
                    setNegativePrompt(e.currentTarget.value);
                }}
            />
        </div>
        <div>
            <span>
                Number of Images: 
            </span>
            <input 
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
            <input 
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
        
        <button 
            type="submit"
        >
            Generate
        </button>
    </form>
    
  </div>;
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