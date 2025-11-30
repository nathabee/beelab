import { createElement } from '@wordpress/element';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl, Button } from '@wordpress/components';
import Timeline from './Timeline';

const Edit = ( { attributes, setAttributes } ) => {
    const { items = [] } = attributes;

    const updateItem = ( index, field, value ) => {
        const nextItems = [ ...items ];
        const current = nextItems[ index ] || { year: '', title: '', description: '' };
        nextItems[ index ] = { ...current, [ field ]: value };
        setAttributes( { items: nextItems } );
    };

    const addItem = () => {
        setAttributes( {
            items: [
                ...items,
                {
                    year: '2025',
                    title: 'New milestone',
                    description: 'Describe this step.',
                },
            ],
        } );
    };

    const removeItem = ( index ) => {
        const nextItems = items.filter( ( _item, i ) => i !== index );
        setAttributes( { items: nextItems } );
    };

    const blockProps = useBlockProps( {
        className: 'beeblock-timeline-editor',
    } );

    return (
        <>
            <InspectorControls>
                <PanelBody title="Timeline entries" initialOpen={ true }>
                    { items.map( ( item, index ) => (
                        <div
                            key={ index }
                            style={ {
                                marginBottom: '1rem',
                                borderBottom: '1px solid #ddd',
                                paddingBottom: '0.75rem',
                            } }
                        >
                            <TextControl
                                label="Year"
                                value={ item.year }
                                onChange={ ( value ) => updateItem( index, 'year', value ) }
                            />
                            <TextControl
                                label="Title"
                                value={ item.title }
                                onChange={ ( value ) => updateItem( index, 'title', value ) }
                            />
                            <TextControl
                                label="Description"
                                value={ item.description }
                                onChange={ ( value ) =>
                                    updateItem( index, 'description', value )
                                }
                            />
                            <Button
                                variant="secondary"
                                isDestructive
                                onClick={ () => removeItem( index ) }
                                style={ { marginTop: '0.5rem' } }
                            >
                                Remove entry
                            </Button>
                        </div>
                    ) ) }

                    <Button variant="primary" onClick={ addItem }>
                        Add entry
                    </Button>
                </PanelBody>
            </InspectorControls>

            <div { ...blockProps }>
                <h3 className="beeblock-timeline-editor__title">Timeline preview</h3>
                <Timeline items={ items } />
            </div>
        </>
    );
};

export default Edit;
