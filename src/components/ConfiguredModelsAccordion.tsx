import {
  Accordion,
  ButtonGroup,
  IconButton,
  Table,
} from "@contentful/f36-components";
import { useSDK } from "@contentful/react-apps-toolkit";
import { DeleteIcon, EditIcon } from "@contentful/f36-icons";
import { ConfigAppSDK } from "@contentful/app-sdk";
import { css } from "emotion";
import { IContentModel } from "../locations/ConfigScreen";

interface IConfiguredModelsAccordion {
  models: Record<string, string>;
  locales: string[];
  parametersModels: Record<string, IContentModel>;
  onUpdate: ({ id, slugField }: { id: string; slugField: string }) => void;
  onDelete: (field: string) => void;
}

export default function ConfiguredModelsAccordion({
  models,
  locales,
  parametersModels,
  onUpdate,
  onDelete,
}: IConfiguredModelsAccordion) {
  const sdk = useSDK<ConfigAppSDK>();

  return (
    <Accordion>
      {Object.entries(parametersModels || {}).map(
        ([id, { slugField = "", patterns }]) => (
          <Accordion.Item key={id} title={models[id]} titleElement="h3">
            <Table>
              <Table.Head>
                <Table.Row>
                  <Table.Cell width={200}>Locale</Table.Cell>
                  <Table.Cell width={150}>Slug Field</Table.Cell>
                  <Table.Cell align="right">
                    <ButtonGroup variant="spaced" spacing="spacingXs">
                      <IconButton
                        variant="transparent"
                        size="small"
                        icon={<DeleteIcon variant="negative" size="small" />}
                        aria-label="Delete Slug Pattern"
                        onClick={() => onDelete(id)}
                      >
                        Delete
                      </IconButton>
                      <IconButton
                        variant="transparent"
                        size="small"
                        icon={<EditIcon variant="primary" size="small" />}
                        aria-label="Edit Slug Pattern"
                        onClick={() =>
                          onUpdate({
                            id,
                            slugField,
                          })
                        }
                      >
                        Edit
                      </IconButton>
                    </ButtonGroup>
                  </Table.Cell>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {locales.map((locale) => (
                  <Table.Row key={locale}>
                    <Table.Cell>{sdk.locales.names[locale]}</Table.Cell>
                    <Table.Cell>{slugField}</Table.Cell>
                    <Table.Cell
                      className={css({
                        overflowX: "auto",
                        maxWidth: "530px",
                      })}
                    >
                      {patterns[locale] || ""}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </Accordion.Item>
        )
      )}
    </Accordion>
  );
}
