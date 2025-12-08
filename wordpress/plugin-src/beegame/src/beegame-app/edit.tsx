import React from 'react';
import { useBlockProps } from '@wordpress/block-editor';

// import './style.css'; not necessary at the moment

// to simplify we will just develop the fronmt end in view.js... 
// we do not need to make the blocks editable at the beginning

const Edit = () => {
  const blockProps = useBlockProps();
  return (
    <div {...blockProps}>
      ⚠️ This app is only visible on the frontend.
    </div>
  );
};

export default Edit;


 