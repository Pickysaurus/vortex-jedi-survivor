import React from 'react';
import { FlexLayout, types } from 'vortex-api';
import { I18N_NAMESPACE } from './common';

interface IProps {
    api: types.IExtensionApi;
}

export default function LoadOrderPanel({ api }: IProps) {
    const { translate: t } = api;

    return (
        <FlexLayout type='column'>
            <div style={{ padding: 'var(--half-gutter, 15px)' }}>
                <h2>
                    {t(
                        'Changing your load order', 
                        { ns: I18N_NAMESPACE }
                    )},
                </h2>
                <p>
                    {t(
                        'Drag and drop the mods on the left to reorder them. Star Wars Jedi: Fallen Order loads mods in alphanumerical order so Vortex prefixes '
                        + 'the folder names with "AAA, AAB, AAC, ..." to ensure they load in the order you set here. '
                        + 'The number in the left column represents the overwrite order. The changes from mods with higher numbers will take priority over other mods which make similar edits.', 
                        { ns: I18N_NAMESPACE }
                    )}
                </p>
                <p>
                    {t(
                        'Note: You can only manage mods installed with Vortex. Installing other mods manually may cause unexpected errors.', 
                        { ns: I18N_NAMESPACE }
                    )}
                </p>
            </div>
        </FlexLayout>
    );
}