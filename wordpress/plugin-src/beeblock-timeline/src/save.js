import { createElement } from '@wordpress/element';
import { useBlockProps } from '@wordpress/block-editor';

const Save = ( { attributes } ) => {
    const { items = [] } = attributes;
    const blockProps = useBlockProps.save( {
        className: 'beeblock-timeline',
    } );

    return (
        <div { ...blockProps }>
            { Array.isArray( items ) &&
                items.map( ( item, index ) => (
                    <details
                        key={ index }
                        className="beeblock-timeline__item"
                    >
                        <summary className="beeblock-timeline__summary">
                            { item.year } — { item.title }
                        </summary>
                        <div className="beeblock-timeline__body">
                            { item.description }
                        </div>
                    </details>
                ) ) }
        </div>
    );
};

export default Save;
