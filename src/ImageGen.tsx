import {
  Component,
  For,
  createEffect,
  createResource,
  createSignal,
  onMount,
  onCleanup,
} from "solid-js";
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
const MAX_SEED = BigInt(2) ** BigInt(63) - BigInt(1);

const IMAGE_DISPLAY_SIZE = { height: 224, width: 288 };

const BASE_URL = "http://localhost:5000";

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
};

//notes on solid:
//destructuring props will cause them to lose reactivity
//onChange for inputs only fires after making a complete change, onInput will fire every keystroke
//use For or Index components to loop in templates, do not use map

const ImageGen: Component<{}> = (props) => {
  type ResponseItem = {
    title?: string;
    updateType: string;
    percentage?: string;
    imageData?: {
      imageUrl: string;
      height: number;
      width: number;
    };
    imagesData?: {
      imageUrl: string;
      height: number;
      width: number;
    }[];
  };

  type Image = {
    imageUrl: string;
    height: number;
    width: number;
    isExpanded: boolean;
  };

  enum Mode {
    QUALITY = "Quality",
    SPEED = "Speed",
    EXTREME_SPEED = "Extreme Speed",
  }

  const getModels = async () => {
    const response = await fetch(`${BASE_URL}/models`);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    return await response.json();
  };

  const getAspectRatios = async () => {
    const response = await fetch(`${BASE_URL}/aspect-ratios`);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    return await response.json();
  };

  const getStyles = async () => {
    const response = await fetch(`${BASE_URL}/styles`);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    return await response.json();
  };

  const getDefaultStyles = async () => {
    const response = await fetch(`${BASE_URL}/styles/default`);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    return await response.json();
  };

  const getLoras = async () => {
    const response = await fetch(`${BASE_URL}/loras`);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    return await response.json();
  };

  const [models, { refetch: refetchModels }] = createResource(getModels);
  const [aspectRatios, { refetch: refetchAspectRatios }] =
    createResource(getAspectRatios);
  const [styles, { refetch: refetchStyles }] = createResource(getStyles);
  const [defaultStyles, { refetch: refetchDefaultStyles }] =
    createResource(getDefaultStyles);
  const [loras, { refetch: refetchLoras }] = createResource(getLoras);

  const [imageGenResponse, setImageGenResponse] = createSignal<ResponseItem>({
    updateType: "none",
    percentage: "0",
    title: "Awaiting input",
  });
  const [imagePreview, setImagePreview] = createSignal<Image>({
    imageUrl: "",
    height: 0,
    width: 0,
    isExpanded: false,
  });
  const [images, setImages] = createSignal<Image[]>([
    { imageUrl: "", height: 0, width: 0, isExpanded: false },
  ]);

  const [prompt, setPrompt] = createSignal("");
  const [negativePrompt, setNegativePrompt] = createSignal(
    "(embedding:unaestheticXLv31:0.8), low quality, watermark",
  );
  const [isRandomSeed, setIsRandomSeed] = createSignal(true);
  const [seed, setSeed] = createSignal(
    generateRandomBigInt(MIN_SEED, MAX_SEED).toString(),
  );
  const [numberOfImages, setNumberOfImages] = createSignal(2);
  const [isEnablePreviewImages, setIsEnablePreviewImages] = createSignal(true);
  const [mode, setMode] = createSignal(Mode.SPEED);
  const [model, setModel] = createSignal("capabilityXL_v20.safetensors");
  const [refinerModel, setRefinerModel] = createSignal("None");
  const [refinerSwitch, setRefinerSwitch] = createSignal(0.667);
  const [size, setSize] = createSignal("1152×896");
  const [isGenerating, setIsGenerating] = createSignal(false);
  const [selectedStyles, setSelectedStyles] = createSignal<string[]>([]);
  const [selectedLoras, setSelectedLoras] = createSignal([
    { model: "None", weight: 0 },
    { model: "None", weight: 0 },
    { model: "None", weight: 0 },
    { model: "None", weight: 0 },
    { model: "None", weight: 0 },
  ]);

  createEffect(() => {
    if (defaultStyles()) {
      setSelectedStyles(defaultStyles());
    }
  });

  const handleImageGenResponseJson = (json: ResponseItem) => {
    try {
      if (json.updateType === "init") {
        setImageGenResponse(json);
      } else if (json.updateType === "preview") {
        setImageGenResponse(json);
        if (json.imageData) {
          try {
            setImagePreview({
              ...json.imageData,
              isExpanded: false,
            });
          } catch (e) {
            console.log("Error displaying image: ", e);
          }
        }
      } else if (json.updateType === "results") {
        if (json.imageData) {
          try {
            performance.mark("set-images-start");
            const image = { ...json.imageData, isExpanded: false };
            setImages((images) => [image, ...images]);
            performance.mark("set-images-end");
            performance.measure(
              "set-images-time",
              "set-images-start",
              "set-images-end",
            );
            setImagePreview({
              imageUrl: "",
              height: 0,
              width: 0,
              isExpanded: false,
            });
          } catch (e) {
            console.log("Error displaying image: ", e);
          }
        }
        // TODO: when job is canceled this will end up pushing the last image to the image array again
      } else if (json.updateType == "finished") {
        if (json.imagesData && json.imagesData.length) {
          json.imagesData.forEach((imageData) => {
            try {
              performance.mark("set-images-start");
              const image = { ...imageData, isExpanded: false };
              setImages((images) => [image, ...images]);
              performance.mark("set-images-end");
              performance.measure(
                "set-images-time",
                "set-images-start",
                "set-images-end",
              );
              setImagePreview({
                imageUrl: "",
                height: 0,
                width: 0,
                isExpanded: false,
              });
            } catch (e) {
              console.log("Error displaying image: ", e);
            }
          });
        }
        setImageGenResponse(json);
      } else {
        console.log("------ THIS IS UNEXPECTED --------");
      }
    } catch (e) {
      console.log("Wheres the error: ", e);
    }
  };

  const cancelImageGen = async () => {
    try {
      const response = await fetch(`http://localhost:5000/image/gen/cancel`);
    } catch (e) {
      console.log("Error canceling image generation: ", e);
    }
  };

  const skipCurrentImageGen = async () => {
    try {
      const response = await fetch(`http://localhost:5000/image/gen/skip`);
    } catch (e) {
      console.log("Error skiping image generation: ", e);
    }
  };

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
    loras,
  }: {
    prompt: string;
    negativePrompt: string;
    seed: string; //TODO: validate that seed is a bigint
    mode: Mode;
    numberOfImages: number;
    isEnablePreviewImages: boolean;
    model: string;
    refinerModel: string;
    refinerSwitch: number;
    size: string;
    styles: string[];
    loras: { model: string; weight: number }[];
  }) => {
    if (isGenerating()) {
      return "Image gen already running";
    }
    //reset images array
    setImages([]);
    setImagePreview({ imageUrl: "", height: 0, width: 0, isExpanded: false });
    setIsGenerating(true);
    try {
      console.log(prompt);
      console.log(negativePrompt);
      console.log(seed);
      console.log(mode);
      console.log(numberOfImages);
      console.log(isEnablePreviewImages);
      console.log(model);
      console.log(refinerModel);
      console.log(refinerSwitch);
      console.log(size);
      console.log(styles);
      console.log(loras);
      const postJson = {
        prompt: prompt,
        negativePrompt: negativePrompt,
        baseModelName: model,
        refinerModelName: refinerModel,
        refinerSwitch: refinerSwitch,
        imageSeed: seed,
        imageNumber: numberOfImages,
        performanceSelection: mode,
        styleSelections: styles,
        aspectRatiosSelection: size,
        enablePreviewImages: isEnablePreviewImages,
        loraParameters: loras,
      };
      const response = await fetch(
        `http://localhost:5000/image/gen`, ///image/gen
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(postJson),
        },
      );

      // Ensure the server is sending a stream
      if (!response.body) {
        throw new Error("Response is not a stream.");
      }
      const reader = response.body.getReader();

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log("Stream complete");
          break;
        }

        buffer += new TextDecoder().decode(value);

        try {
          // Check if the buffer contains a complete JSON object
          const json = JSON.parse(buffer);

          performance.mark("handle-image-gen-response-start");
          handleImageGenResponseJson(json);
          performance.mark("handle-image-gen-response-end");
          performance.measure(
            "image-gen-response-handler-time",
            "handle-image-gen-response-start",
            "handle-image-gen-response-end",
          );

          // Reset the buffer for the next message
          buffer = "";
        } catch (e) {
          // The JSON is not complete, so wait for more chunks
          // console.log("Incomplete JSON, waiting for more data...");
          try {
            if (buffer.includes("\n\n")) {
              const splitBuffer = buffer.split("\n\n");

              const end = splitBuffer.pop();
              buffer = end ? end : "";

              splitBuffer.forEach((el) => {
                try {
                  const json = JSON.parse(el);
                  performance.mark("handle-image-gen-response-in-error-start");
                  handleImageGenResponseJson(json);
                  performance.mark("handle-image-gen-response-in-error-end");
                  performance.measure(
                    "image-gen-response-in-error-handler-time",
                    "handle-image-gen-response-in-error-start",
                    "handle-image-gen-response-in-error-end",
                  );
                } catch (e) {
                  console.log("could not process: ", el);
                  console.log("error: ", e);
                }
              });
            }
          } catch (nestedError) {
            console.log("NESTED ERROR: ", nestedError);
          }
        }
      }
      setIsGenerating(false);
      return true;
    } catch (error) {
      console.log("error: ", error);
      setIsGenerating(false);
      return false;
    }
  };

  const logPerformance = (name: string) => {
    const perf = performance.getEntriesByName(name);
    console.log(name + ": ", perf);
    console.log(calculateAveragePerformance(perf));
  };

  const calculateAveragePerformance = (measures: PerformanceEntryList) => {
    const totalDuration = measures.reduce(
      (total, measure) => total + measure.duration,
      0,
    );
    return measures.length > 0 ? totalDuration / measures.length : 0;
  };

  const [getPromptBarWidth, promptBarRef] = useElementWidth();

  return (
    <div>
      <div class="flex h-screen">
        {/* <div class="flex-auto w-64 p-2 overflow-auto"> */}
        <div
          class="fixed top-6 left-0 w-64 p-2 border-t border-r rounded border-zinc-800 overflow-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-zinc-600"
          style={{ height: "calc(100vh - 24px)" }}
        >
          <div class="flex flex-grow justify-center">Model Config</div>
          <div>
            {models.loading ? (
              <span> MODELS LOADING </span>
            ) : (
              <>
                <DropdownSelect
                  options={[
                    { value: "None", label: "None" },
                    ...models().map((model: string) => {
                      return { value: model, label: model };
                    }),
                  ]}
                  onChange={(e) => setModel(e[0].value)}
                  label="Choose a model:"
                  defaultSelected={model()}
                  enableItemToolTips
                />
              </>
            )}
          </div>
          <div>
            {models.loading ? (
              <span> MODELS LOADING </span>
            ) : (
              <>
                <DropdownSelect
                  options={[
                    { value: "None", label: "None" },
                    ...models().map((model: string) => {
                      return { value: model, label: model };
                    }),
                  ]}
                  onChange={(e) => setRefinerModel(e[0].value)}
                  label="Choose a refiner model:"
                  defaultSelected={refinerModel()}
                  enableItemToolTips
                />
              </>
            )}
          </div>
          <div>
            <span>{"Refiner Switch (< 1): "}</span>
            <Input
              id="number-of-images"
              value={refinerSwitch()}
              onChange={(e) => {
                setRefinerSwitch(Number(e.currentTarget.value));
              }}
            />
          </div>
          <div class="flex">
            <Button type="button" onClick={() => refetchModels()}>
              Refresh Models
            </Button>
          </div>
          <div>
            <span>Number of Images:</span>
            <Input
              id="number-of-images"
              value={numberOfImages()}
              onChange={(e) => {
                setNumberOfImages(Number(e.currentTarget.value));
              }}
            />
          </div>
          <div>
            <span>Randomise Seed:</span>
            <input
              type="checkbox"
              id="is-random-seed"
              checked={isRandomSeed()}
              onChange={(e) => {
                setIsRandomSeed(e.target.checked);
                if (e.target.checked) {
                  setSeed(generateRandomBigInt(MIN_SEED, MAX_SEED).toString());
                }
              }}
            />
          </div>
          <div>
            <span>Seed:</span>
            <Input
              id="seed"
              value={seed()}
              onChange={(e) => {
                setSeed(e.currentTarget.value);
              }}
            />
          </div>
          <div>
            <span>Enable Preview Images:</span>
            <input
              type="checkbox"
              id="is-enable-preview-images"
              checked={isEnablePreviewImages()}
              onChange={(e) => {
                setIsEnablePreviewImages(e.target.checked);
              }}
            />
          </div>
          <div>
            <span>Mode:</span>
            {Object.entries(Mode).map((entry, index) => {
              return (
                <>
                  <input
                    type="radio"
                    id={`mode-${index}`}
                    name="mode-radio"
                    value={entry[1]}
                    checked={mode() === entry[1]}
                    onChange={() => setMode(entry[1])}
                  />
                  <label for={entry[1]}>{entry[1]}</label>
                  {index < Object.entries(Mode).length && <br />}
                </>
              );
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
            <span>Image Size:</span>
            {aspectRatios.loading ? (
              <span> AVAILABLE ASPECT RATIOS LOADING </span>
            ) : (
              <>
                {/* TODO: onFocus */}
                <DropdownSelect
                  options={aspectRatios().map(
                    (ratio: { dimensions: string; ratio: string }) => {
                      return {
                        value: ratio.dimensions,
                        label: ratio.dimensions + " " + ratio.ratio,
                      };
                    },
                  )}
                  onChange={(e) => setSize(e[0].value)}
                  label="Choose a size:"
                  defaultSelected={size()}
                />
              </>
            )}
          </div>
          {/* TODO: move button next to prompt */}

          <div>
            <span>Lora Config:</span>
            {loras.loading ? (
              <span> LORAS LOADING </span>
            ) : (
              <>
                <For each={selectedLoras()}>
                  {(item, index) => {
                    return (
                      <div>
                        <DropdownSelect
                          options={[
                            { value: "None", label: " None" },
                            ...loras().map((lora: string) => {
                              return { value: lora, label: lora };
                            }),
                          ]}
                          onChange={(e) =>
                            setSelectedLoras((selected) => {
                              selected[index()] = {
                                model: e[0].value,
                                weight: selected[index()].weight,
                              };
                              return selected;
                            })
                          }
                          label={`Lora ${index() + 1}:`}
                          defaultSelected={item.model}
                          class="mb-1"
                        />
                        <Input
                          value={item.weight}
                          onChange={(e) => {
                            setSelectedLoras((selected) => {
                              selected[index()] = {
                                model: selected[index()].model,
                                weight: Number(e.currentTarget.value),
                              };
                              return selected;
                            });
                          }}
                        ></Input>
                      </div>
                    );
                  }}
                </For>
              </>
            )}
          </div>
          <div>
            <Button type="button" onClick={() => refetchLoras()}>
              Refresh Loras
            </Button>
          </div>

          <div>
            <span>Styles:</span>
            {styles.loading ? (
              <span> STYLES LOADING</span>
            ) : (
              <div class="flex flex-wrap">
                {styles().map((style: string, index: number) => {
                  return (
                    <div class="w-full">
                      <CheckBox
                        type="checkbox"
                        id={style}
                        value={style}
                        checked={selectedStyles().includes(style)}
                        onChange={() => {
                          setSelectedStyles((prev) => {
                            if (prev.includes(style)) {
                              // Remove the Option if it's already in the array
                              return prev.filter((item) => item !== style);
                            } else {
                              // Add the Option if it's not in the array
                              return [...prev, style];
                            }
                          });
                        }}
                      />
                      {/* {index != 0 && index % 3 == 0 ? <br /> : <></> } */}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div ref={promptBarRef} class="ml-64 flex-auto relative">
          <div
            class="fixed top-0 right-0 bg-zinc-700 z-10"
            style={{ width: `${getPromptBarWidth()}px` }}
          >
            <div class="flex p-1 mt-2">
              <div class="w-2/5 m-1 mb-0">
                <span>Prompt:</span>
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
                <span>Negative Prompt:</span>
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
                  {!isGenerating() && (
                    <Button
                      type="button"
                      onClick={async (e) => {
                        e.preventDefault();
                        performance.mark("gen-image-start");
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
                          loras: selectedLoras(),
                        });
                        performance.mark("gen-image-end");
                        performance.measure(
                          "gen-image-time",
                          "gen-image-start",
                          "gen-image-end",
                        );
                        if (isSuccess && isRandomSeed()) {
                          setSeed(
                            generateRandomBigInt(MIN_SEED, MAX_SEED).toString(),
                          );
                        }
                      }}
                    >
                      Generate
                    </Button>
                  )}
                  {isGenerating() && (
                    <>
                      <Button type="button" onClick={() => cancelImageGen()}>
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={() => skipCurrentImageGen()}
                      >
                        Skip
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div
            class="mt-41 pl-1 pr-2 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-zinc-600"
            style={{ height: "calc(100vh - 162px)" }}
          >
            <div class="flex flex-row flex-wrap">
              {isEnablePreviewImages() && isGenerating() && (
                <div
                  class="m-1"
                  style={`max-height: ${imagePreview().height}px; max-width: ${
                    imagePreview().width
                  }px`}
                >
                  <img
                    class="object-contain flex-shrink-0"
                    src={imagePreview().imageUrl}
                    alt="Preview"
                    height={imagePreview().height}
                    width={imagePreview().width}
                  />
                </div>
              )}
              <For each={images()} fallback={"Images generating"}>
                {(image, index) => {
                  const heightRatio = image.width / IMAGE_DISPLAY_SIZE.width;
                  const widthRatio = image.height / IMAGE_DISPLAY_SIZE.height;
                  let adjust =
                    heightRatio >= widthRatio ? heightRatio : widthRatio;

                  const height = image.isExpanded
                    ? image.height
                    : image.height / adjust;
                  const width = image.isExpanded
                    ? image.width
                    : image.width / adjust;
                  return (
                    <div
                      class="m-1"
                      style={`max-height: ${
                        image.isExpanded ? image.height : image.height / adjust
                      }px; max-width: ${
                        image.isExpanded ? image.width : image.width / adjust
                      }px`}
                      onClick={(e) => {
                        const targetImage = e.target as HTMLImageElement;
                        if (targetImage.parentElement) {
                          const parent = targetImage.parentElement;
                          if (image.isExpanded) {
                            parent.style.maxHeight =
                              (image.height / adjust).toString() + "px";
                            parent.style.maxWidth =
                              (image.width / adjust).toString() + "px";
                            image.isExpanded = false;
                          } else {
                            parent.style.maxHeight =
                              image.height.toString() + "px";
                            parent.style.maxWidth =
                              image.width.toString() + "px";
                            image.isExpanded = true;
                          }
                        }
                      }}
                    >
                      <img
                        class="object-contain"
                        src={image.imageUrl}
                        alt={`Image ${index()}`}
                        height={image.height}
                        width={image.width}
                      />
                    </div>
                  );
                }}
              </For>
            </div>
            <div class="fixed bottom-0 right-0 p-2">
              <div>
                <Button
                  type="button"
                  onClick={() => {
                    logPerformance("gen-image-time");
                    logPerformance("image-gen-response-handler-time");
                    logPerformance("image-gen-response-in-error-handler-time");
                    logPerformance("set-images-time");
                  }}
                >
                  Output Metrics to Console
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    performance.clearMarks();
                    performance.clearMeasures();
                  }}
                >
                  Clear Metrics
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageGen;
