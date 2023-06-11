import { ConfigAppSDK } from "@contentful/app-sdk";
import {
  Accordion,
  Button,
  Flex,
  Form,
  Heading,
  IconButton,
  ModalConfirm,
  ModalLauncher,
  Paragraph,
  Stack,
  Table,
  Text,
  Box,
  TextInput,
  FormControl,
  Switch,
  Pill,
} from "@contentful/f36-components";
import { PlusIcon } from "@contentful/f36-icons";
import { useCMA, useSDK } from "@contentful/react-apps-toolkit";
import { css } from "emotion";
import { useCallback, useEffect, useReducer, useState } from "react";
import SlugFieldsDropdown from "../components/SlugFieldsDropdown";
import ContentModelsDropdown from "../components/ContentModelsDropdown";
import SlugFieldPatternModal from "../components/SlugFieldPatternModal";
import ConfiguredModelsAccordion from "../components/ConfiguredModelsAccordion";

export interface IContentModel {
  id: string;
  slugField?: string;
  patterns: Record<string, string>;
}

export interface AppInstallationParameters {
  pathPrefix?: string;
  showPathPrefix?: boolean;
  customReplacements?: string[][];
  lockWhenPublished?: boolean;
  maintainCase?: boolean;
  preserveLeadingUnderscore?: boolean;
  showCopyButton?: boolean;
  showPreviewLink?: boolean;
  preserveCharacters?: string[];
  paths?: Record<string, string>;
  models?: Record<string, IContentModel>;
}

interface IState {
  phase: "configModel" | "configField" | "configPattern";
  activeModel: string;
  activeSlugField: string;
  models: Record<string, string>;
}

const ConfigScreen = () => {
  const [parameters, setParameters] = useState<AppInstallationParameters>({});
  const sdk = useSDK<ConfigAppSDK>();
  const cma = useCMA();

  const [state, setState] = useReducer(
    (state: IState, newState: Partial<IState>) => ({
      ...state,
      ...newState,
    }),
    {
      phase: "configModel",
      activeModel: "",
      activeSlugField: "",
      models: {},
    }
  );

  const locales = sdk.locales.available.sort((a, b) => {
    if (a === sdk.locales.default) {
      return -1;
    } else if (b === sdk.locales.default) {
      return 1;
    } else {
      return a.localeCompare(b);
    }
  });

  const onConfigure = useCallback(async () => {
    // This method will be called when a user clicks on "Install"
    // or "Save" in the configuration screen.
    // for more details see https://www.contentful.com/developers/docs/extensibility/ui-extensions/sdk-reference/#register-an-app-configuration-hook

    // Get current the state of EditorInterface and other entities
    // related to this app installation
    const currentState = await sdk.app.getCurrentState();

    return {
      // Parameters to be persisted as the app configuration.
      parameters,
      // In case you don't want to submit any update to app
      // locations, you can just pass the currentState as is
      targetState: currentState,
    };
  }, [parameters, sdk]);

  useEffect(() => {
    // `onConfigure` allows to configure a callback to be
    // invoked when a user attempts to install the app or update
    // its configuration.
    sdk.app.onConfigure(() => onConfigure());
  }, [sdk, onConfigure]);

  useEffect(() => {
    (async () => {
      const contentModels = await cma.contentType.getMany({ limit: 1000 });
      const contentModelsDefaults = contentModels.items.reduce(
        (acc: Record<string, string>, item) => {
          acc[item.sys.id] = item.name;
          return acc;
        },
        {}
      );

      // Get current parameters of the app.
      // If the app is not installed yet, `parameters` will be `null`.
      const currentParameters: AppInstallationParameters | null =
        await sdk.app.getParameters();

      if (currentParameters && "models" in currentParameters) {
        setParameters(currentParameters);
      } else {
        setParameters({
          pathPrefix: "",
          showPathPrefix: true,
          customReplacements: [],
          lockWhenPublished: true,
          maintainCase: false,
          preserveLeadingUnderscore: false,
          showCopyButton: false,
          showPreviewLink: true,
          preserveCharacters: [],
          paths: {},
          models: {},
        });
      }

      setState({ models: contentModelsDefaults });

      // Once preparation has finished, call `setReady` to hide
      // the loading screen and present the app to a user.
      sdk.app.setReady();
    })();
  }, [sdk]);

  const handleSaveSlugPatterns = (patterns: Record<string, string>) => {
    const newParameters = {
      ...parameters,
      models: {
        ...parameters.models,
        [state.activeModel]: {
          id: state.activeModel,
          slugField: state.activeSlugField,
          patterns,
        },
      },
    };

    sdk.notifier.success(
      `Slug Pattern saved for ${state.models[state.activeModel]}`
    );

    setParameters(newParameters);
    setState({ phase: "configModel", activeModel: "", activeSlugField: "" });
  };

  const handleDeleteSlugPattern = async (id: string) => {
    const result = await ModalLauncher.open(({ isShown, onClose }) => (
      <ModalConfirm
        title="Remove Slug Pattern"
        intent="negative"
        isShown={isShown}
        onCancel={() => {
          onClose(false);
        }}
        onConfirm={() => {
          onClose(true);
        }}
        confirmLabel="Yes, remove it"
        cancelLabel="Cancel"
      >
        <Text>
          Do you want to remove the slug pattern for {state.models[id]}?
        </Text>
      </ModalConfirm>
    ));

    if (result) {
      delete parameters.models?.[id];

      const newParameters = {
        ...parameters,
        models: {
          ...parameters.models,
        },
      };

      sdk.notifier.success(`Slug Pattern removed for ${state.models[id]}`);

      setParameters(newParameters);
    }
  };

  return (
    <Flex
      flexDirection="column"
      className={css({ margin: "40px 80px", maxWidth: "800px" })}
    >
      <Form>
        <Heading>Better Slugs Config</Heading>
        <Paragraph>
          In order to properly use the Better Slugs extension, you need to
          configure the content types and fields that you want to use.
          Additionally, you can configure the locale path mappings if you are
          using locale tokens.
        </Paragraph>

        <Box marginBottom="spacingXl">
          <Accordion>
            <Accordion.Item title="General Settings">
              <FormControl>
                <FormControl.Label>Website URL</FormControl.Label>
                <TextInput
                  id="path-prefix"
                  type="text"
                  name="path-prefix"
                  placeholder="https://www.example.com"
                  value={parameters.pathPrefix || ""}
                  onChange={(e) => {
                    setParameters({
                      ...parameters,
                      pathPrefix: e.target.value,
                    });
                  }}
                />
                <FormControl.HelpText>
                  Leave empty if you don't want to use a website domain. It will
                  be used to generate the preview links.
                </FormControl.HelpText>
              </FormControl>

              <FormControl>
                <FormControl.Label>Custom Char Replacements</FormControl.Label>
                <TextInput.Group spacing="spacingS">
                  <TextInput
                    id="replacement-key"
                    type="text"
                    name="path-prefix"
                    placeholder="char"
                    defaultValue=""
                    width={100}
                  />
                  <TextInput
                    id="replacement-value"
                    type="text"
                    name="path-prefix"
                    placeholder="replacement"
                    defaultValue=""
                    width={100}
                  />

                  <IconButton
                    icon={<PlusIcon />}
                    aria-label="Add replacement"
                    variant="secondary"
                    onClick={() => {
                      const inputKey = document.getElementById(
                        "replacement-key"
                      ) as HTMLInputElement;
                      const inputValue = document.getElementById(
                        "replacement-value"
                      ) as HTMLInputElement;
                      const key = inputKey.value.trim();
                      const value = inputValue.value.trim();

                      if (
                        key &&
                        value &&
                        !parameters.customReplacements?.find(
                          (r) => r[0] === key
                        )
                      ) {
                        setParameters({
                          ...parameters,
                          customReplacements: [
                            ...(parameters.customReplacements || []),
                            [key, ` ${value} `],
                          ],
                        });
                        inputKey.value = "";
                        inputValue.value = "";
                      }
                    }}
                  >
                    Add
                  </IconButton>
                </TextInput.Group>
                <FormControl.HelpText>
                  You can provide custom char replacements, e.g. replace{" "}
                  <code>"&"</code> with <code>"at"</code>
                </FormControl.HelpText>
                <Stack marginTop="spacingS">
                  {parameters.customReplacements?.map(([key, value]) => (
                    <Pill
                      key={`${key}-${value}`}
                      label={`${key} → ${value.trim()}`}
                      onClose={() => {
                        setParameters({
                          ...parameters,
                          customReplacements:
                            parameters.customReplacements?.filter(
                              (r) => key !== r[0]
                            ) || [],
                        });
                      }}
                    />
                  ))}
                </Stack>
              </FormControl>

              <FormControl>
                <FormControl.Label>Show Copy Button</FormControl.Label>
                <Switch
                  name="lock-when-published"
                  id="lock-when-published"
                  isChecked={parameters.showCopyButton || false}
                  onChange={(e) =>
                    setParameters({
                      ...parameters,
                      showCopyButton: e.target.checked,
                    })
                  }
                >
                  {parameters.showCopyButton ? "Yes" : "No"}
                </Switch>
                <FormControl.HelpText>
                  If enabled, a button that allows to copy the slug/url into the
                  clipboard is displayed. Should be disabled if the preview link
                  is enabled.
                </FormControl.HelpText>
              </FormControl>

              <FormControl>
                <FormControl.Label>
                  Show Website URL (slug path prefix)
                </FormControl.Label>
                <Switch
                  name="lock-when-published"
                  id="lock-when-published"
                  isChecked={parameters.showPathPrefix || false}
                  onChange={(e) =>
                    setParameters({
                      ...parameters,
                      showPathPrefix: e.target.checked,
                    })
                  }
                >
                  {parameters.showPathPrefix ? "Yes" : "No"}
                </Switch>
                <FormControl.HelpText>
                  If enabled, the path prefix value (website url) will be
                  displayed in same line of the slug input field.
                </FormControl.HelpText>
              </FormControl>

              <FormControl>
                <FormControl.Label>Show Preview Link</FormControl.Label>
                <Switch
                  name="lock-when-published"
                  id="lock-when-published"
                  isChecked={parameters.showPreviewLink || false}
                  onChange={(e) =>
                    setParameters({
                      ...parameters,
                      showPreviewLink: e.target.checked,
                    })
                  }
                >
                  {parameters.showPreviewLink ? "Yes" : "No"}
                </Switch>
                <FormControl.HelpText>
                  If enabled, a preview link for the slug is displayed.
                </FormControl.HelpText>
              </FormControl>

              <FormControl>
                <FormControl.Label>Lock when published</FormControl.Label>
                <Switch
                  name="lock-when-published"
                  id="lock-when-published"
                  isChecked={parameters.lockWhenPublished || false}
                  onChange={(e) =>
                    setParameters({
                      ...parameters,
                      lockWhenPublished: e.target.checked,
                    })
                  }
                >
                  {parameters.lockWhenPublished ? "Yes" : "No"}
                </Switch>
                <FormControl.HelpText>
                  If enabled, the slug will be locked when the entry is
                  Published and will not automatically update.
                </FormControl.HelpText>
              </FormControl>

              <FormControl>
                <FormControl.Label>Maintain Case</FormControl.Label>
                <Switch
                  name="lock-when-published"
                  id="lock-when-published"
                  isChecked={parameters.maintainCase || false}
                  onChange={(e) =>
                    setParameters({
                      ...parameters,
                      maintainCase: e.target.checked,
                    })
                  }
                >
                  {parameters.maintainCase ? "Yes" : "No"}
                </Switch>
                <FormControl.HelpText>
                  If enabled, the slug will be maintain the same case as the
                  original value.
                </FormControl.HelpText>
              </FormControl>

              <FormControl>
                <FormControl.Label>
                  Preserve Leading Underscore
                </FormControl.Label>
                <Switch
                  name="lock-when-published"
                  id="lock-when-published"
                  isChecked={parameters.preserveLeadingUnderscore || false}
                  onChange={(e) =>
                    setParameters({
                      ...parameters,
                      preserveLeadingUnderscore: e.target.checked,
                    })
                  }
                >
                  {parameters.preserveLeadingUnderscore ? "Yes" : "No"}
                </Switch>
                <FormControl.HelpText>
                  Sometimes leading underscores are intentional, for example,
                  filenames representing hidden paths on a website.
                </FormControl.HelpText>
              </FormControl>

              <FormControl>
                <FormControl.Label>
                  Preserve certain characters (Separated by comma).
                </FormControl.Label>

                <TextInput
                  id="path-prefix"
                  type="text"
                  name="path-prefix"
                  placeholder="#,!,..."
                  value={parameters?.preserveCharacters?.join(",") || ""}
                  onChange={(e) => {
                    setParameters({
                      ...parameters,
                      preserveCharacters: e.target.value.split(","),
                    });
                  }}
                />
                <FormControl.HelpText>
                  For example, if you want to slugify URLs, but preserve the
                  HTML fragment # character.
                </FormControl.HelpText>
              </FormControl>
            </Accordion.Item>

            <Accordion.Item title="Create a Better Slugs configuration">
              <Paragraph>
                In order to create a Better Slugs configuration you need to have
                a "slug" field already created in your content model.
              </Paragraph>
              <ContentModelsDropdown
                activeModel={state.activeModel}
                onChange={(model) =>
                  setState({
                    activeModel: model,
                    activeSlugField: "",
                    phase: "configField",
                  })
                }
                configuredModels={parameters.models}
              />

              {state.phase === "configField" && state.activeModel && (
                <SlugFieldsDropdown
                  activeSlugField={state.activeSlugField}
                  model={state.activeModel}
                  onChange={(field) => setState({ activeSlugField: field })}
                />
              )}

              <Button
                variant="positive"
                onClick={() => setState({ phase: "configPattern" })}
                isDisabled={!state.activeModel || !state.activeSlugField}
              >
                Add and configure
              </Button>
            </Accordion.Item>

            <Accordion.Item title="Better Slugs Configurations">
              <ConfiguredModelsAccordion
                models={state.models}
                locales={locales}
                parametersModels={parameters.models || {}}
                onUpdate={({ id, slugField }) =>
                  setState({
                    activeModel: id,
                    activeSlugField: slugField,
                    phase: "configPattern",
                  })
                }
                onDelete={handleDeleteSlugPattern}
              />
            </Accordion.Item>

            <Accordion.Item title="Locale Path Mappings">
              <Paragraph>
                If using locale tokens configure the mapping between contentful
                locale and the slug path. (e.g. en-US: en, de-DE: de)
              </Paragraph>
              <Table>
                <Table.Head>
                  <Table.Row>
                    <Table.Cell width={100}>Locale</Table.Cell>
                    <Table.Cell width={100}>Path</Table.Cell>
                  </Table.Row>
                </Table.Head>
                <Table.Body>
                  {locales.map((locale) => (
                    <Table.Row key={locale}>
                      <Table.Cell>
                        {sdk.locales.names[locale]}: {locale}
                      </Table.Cell>
                      <Table.Cell>
                        <TextInput
                          id={`path-${locale}`}
                          type="text"
                          name={`path-${locale}`}
                          placeholder={`e.g. ${locale.toLocaleLowerCase()}`}
                          value={parameters.paths?.[locale] || ""}
                          onChange={(e) => {
                            setParameters({
                              ...parameters,
                              paths: {
                                ...parameters.paths,
                                [locale]: e.target.value,
                              },
                            });
                          }}
                        />
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </Accordion.Item>
          </Accordion>
        </Box>

        {state.phase === "configPattern" && (
          <SlugFieldPatternModal
            model={state.activeModel}
            slugField={state.activeSlugField}
            locales={locales}
            patterns={parameters.models?.[state.activeModel]?.patterns || {}}
            onSave={handleSaveSlugPatterns}
            onClose={() =>
              setState({
                activeModel: "",
                activeSlugField: "",
                phase: "configModel",
              })
            }
          />
        )}
      </Form>
    </Flex>
  );
};

export default ConfigScreen;
