import { createElement } from '@wordpress/element';

const Timeline = ( { items = [] } ) => {
    if ( ! Array.isArray( items ) ) {
        items = [];
    }

    return (
        <div className="beeblock-timeline">
            { items.map( ( item, index ) => (
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

export default Timeline;
