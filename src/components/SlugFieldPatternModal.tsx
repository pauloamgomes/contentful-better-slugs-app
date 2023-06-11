import {
  Button,
  Modal,
  SectionHeading,
  Table,
  TextInput,
} from "@contentful/f36-components";
import { useSDK } from "@contentful/react-apps-toolkit";
import { useState } from "react";
import AvailableTokens, { insertToken } from "./AvailableTokens";
import { ConfigAppSDK } from "@contentful/app-sdk";
import { css } from "emotion";

interface ISlugFieldPatternModal {
  model: string;
  slugField?: string;
  locales: string[];
  patterns: Record<string, string>;
  onSave: (value: Record<string, string>) => void;
  onClose: () => void;
}

export default function SlugFieldPatternModal({
  model,
  patterns,
  locales,
  slugField = "",
  onSave,
  onClose,
}: ISlugFieldPatternModal) {
  const sdk = useSDK<ConfigAppSDK>();

  const [value, setValue] = useState<Record<string, string>>(patterns || {});
  const [activeLocale, setActiveLocale] = useState<string>(sdk.locales.default);
  const [activePosition, setActivePosition] = useState<number>(0);

  return (
    <Modal onClose={onClose} title="Edit Slug Pattern" isShown size="960px">
      {() => (
        <>
          <Modal.Header title="Update Slug Pattern" onClose={onClose} />
          <Modal.Content>
            <>
              <SectionHeading as="h3">Configure Pattern</SectionHeading>
              <Table>
                <Table.Head>
                  <Table.Row>
                    <Table.Cell>Locale</Table.Cell>
                    <Table.Cell>Slug Pattern</Table.Cell>
                  </Table.Row>
                </Table.Head>
                <Table.Body>
                  {locales.map((locale, index) => (
                    <Table.Row key={locale}>
                      <Table.Cell
                        width={200}
                        className={css({
                          fontWeight: index ? "normal" : "bold",
                        })}
                      >
                        {sdk.locales.names[locale]}
                      </Table.Cell>
                      <Table.Cell>
                        <TextInput
                          id={`pattern-${locale}`}
                          type="text"
                          name={`pattern-${locale}`}
                          placeholder="[field:title]"
                          value={value?.[locale] || ""}
                          isRequired={index === 0}
                          onBlur={(e) => {
                            setActiveLocale(locale);
                            setActivePosition(e.target.selectionStart || 0);
                          }}
                          onChange={(e) => {
                            setValue({ ...value, [locale]: e.target.value });
                          }}
                        />
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>

              <SectionHeading as="h4" marginTop="spacingM">
                Available Tokens
              </SectionHeading>

              <AvailableTokens
                name={model}
                activeSlugField={slugField}
                onClick={(token) => {
                  const input = document.getElementById(
                    `pattern-${activeLocale}`
                  ) as HTMLInputElement;
                  input.setSelectionRange(activePosition, activePosition);
                  setValue({
                    ...value,
                    [activeLocale]: insertToken(
                      input.value,
                      token,
                      activePosition
                    ),
                  });
                }}
              />
            </>
          </Modal.Content>
          <Modal.Controls>
            <Button size="small" variant="transparent" onClick={onClose}>
              Close
            </Button>
            <Button
              size="small"
              variant="positive"
              onClick={() => onSave(value)}
            >
              Save
            </Button>
          </Modal.Controls>
        </>
      )}
    </Modal>
  );
}
