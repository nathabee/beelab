// competence-app/index.ts

 
import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import edit from './edit';
import save from './save';


//we do not use wp :This avoids depending on the wp global, which may not be defined yet at runtime, especially in strict builds or FSE.
registerBlockType(metadata.name, {
  ...metadata,
  edit,
  save,
});


 