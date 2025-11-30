// src/pages/BeeFontHome.tsx
//
// Landing page for the BeeFont plugin.
// Visible for logged-in and anonymous users.
// Explains what BeeFont does and gives a compact user manual / workflow overview.

'use client';

import React from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '@bee/common';

const Home: React.FC = () => {
  const { isLoggedIn, user } = useUser();

  return (
    <div className="bee-beefont-home container py-4">
      {/* Intro / hero */}
      <section className="mb-4">
        <h1 className="h3 mb-3">Welcome to BeeFont</h1>

        {isLoggedIn ? (
          <p className="text-muted">
            Signed in as <strong>{user?.username}</strong>. You can continue an existing font job
            or start a new one from the dashboard.
          </p>
        ) : (
          <p className="text-muted">
            You are not logged in. You can either sign in with an existing account or try BeeFont in
            demo mode from the <code>/login</code> page.
          </p>
        )}
      </section>

      {/* What is BeeFont */}
      <section className="mb-4">
        <h2 className="h4">What is BeeFont?</h2>
        <p>
          BeeFont lets you turn hand-drawn letters into real font files (TTF). For each job you
          choose an active glyph format and work mainly in the glyph editor:
          <strong> PNG</strong> (bitmap) or <strong>SVG</strong> (vector).
        </p>
        <p>
          The typical way of working is to create glyphs directly in the editor, for both PNG
          and SVG jobs. SVG glyphs give the cleanest outlines and the best font quality, so this is
          the recommended mode. Existing SVG glyphs can be loaded into the editor and modified;
          existing PNG glyphs from scans are not editable in-place, for PNG you simply draw new
          variants on a blank canvas.
        </p>
        <p>
          In addition, BeeFont can analyse scanned template pages and automatically extract PNG
          glyphs from the grid. These scanned glyphs can be used as-is.
        </p>
        <p>
          The plugin is the frontend of a BeeLab workflow: it talks to a Django backend that handles
          image processing, glyph storage and font generation.
        </p>
      </section>

      {/* Workflow overview */}
      <section className="mb-4">
        <h2 className="h4">Workflow at a glance</h2>
        <ol className="mb-3">
          <li className="mb-2">
            <strong>Create a BeeFont job</strong>{' '}
            Define a language (for example DE, EN, FR) and a template set. Each job groups its
            pages, glyphs and font builds. On the job overview you choose the active glyph format
            (<strong>PNG</strong> or <strong>SVG</strong>) for the editor and builds and can switch
            this later if needed.
          </li>
          <li className="mb-2">
            <strong>Draw glyphs in the editor</strong>{' '}
            Open the glyph editor and draw each character directly on screen. In PNG mode you paint
            on a bitmap canvas with guidelines; in SVG mode you work with strokes and control
            points. SVG mode is recommended because the outlines are clean and scale perfectly in
            the final font. For SVG, existing glyphs can be loaded and refined; for PNG, the editor
            always starts with a fresh canvas.
          </li>
          <li className="mb-2">
            <strong>(Optional) Print and scan templates for PNG glyphs</strong>{' '}
            If you prefer to write on paper, you can print A4 grid templates, fill them by hand and
            upload the scans on the <em>Print / Upload</em> page. BeeFont analyses the grids and
            creates PNG glyph variants automatically. These PNG variants can then be reviewed in the
            glyph browser or replaced by manually drawn SVG glyphs for important letters.
          </li>
          <li className="mb-2">
            <strong>Review and manage glyphs</strong>{' '}
            On the glyph browser you see all variants per character. You can set the default variant
            for each letter, delete unwanted variants, and (in SVG mode) jump straight into the glyph
            editor for a specific letter to modify its vector shape.
          </li>
          <li className="mb-2">
            <strong>Check missing characters</strong>{' '}
            The language status view shows which required characters are covered and which are still
            missing for a complete font for each language and glyph format.
          </li>
          <li className="mb-2">
            <strong>Build and download the font</strong>{' '}
            Once all required glyphs are present for a language, you trigger a font build. For
            PNG-based jobs the backend converts your PNG glyphs to SVG outlines before building the
            TTF; for SVG-based jobs it uses your vector glyphs directly. You then download the TTF
            and install it on your system.
          </li>
        </ol>
      </section>

      {/* Practical navigation / next steps */}
      <section className="mb-4">
        <h2 className="h4">What can I do from here?</h2>

        {isLoggedIn ? (
          <div>
            <p>As a logged-in user you usually want to:</p>
            <ul>
              <li>
                Go to the{' '}
                <Link to="/dashboard">
                  BeeFont dashboard
                </Link>{' '}
                to see all your jobs, choose the active glyph format (PNG / SVG), and check their
                status.
              </li>
              <li>
                Start a new job and then visit{' '}
                <Link to="/printupload">
                  Print / Upload
                </Link>{' '}
                if you want to work with printed templates and scanned pages in addition to the
                editor.
              </li>
              <li>
                Use the{' '}
                <Link to="/glyphbrowser">
                  glyph browser
                </Link>{' '}
                to inspect and fine-tune extracted glyphs, set default variants, delete unwanted
                variants, and, in SVG jobs, jump into the glyph editor for particular letters.
              </li>
              <li>
                Open{' '}
                <Link to="/missingcharacters">
                  missing characters
                </Link>{' '}
                to see which glyphs are still required for a complete font in a given language and
                format.
              </li>
              <li>
                Finally, go to{' '}
                <Link to="/fontBuild">
                  build font
                </Link>{' '}
                to generate and download your TTF.
              </li>
            </ul>
          </div>
        ) : (
          <div>
            <p>Without an account you have two options:</p>
            <ul>
              <li>
                <strong>Sign in</strong> with your BeeLab account on the{' '}
                <Link to="/login">
                  login page
                </Link>
                .
              </li>
              <li>
                Or <strong>try the demo</strong> from the same login page (demo users and data are
                temporary and may be cleaned up automatically).
              </li>
            </ul>
          </div>
        )}
      </section>

      {/* Technical note */}
      <section className="mb-4">
        <h2 className="h5">Notes and limitations</h2>
        <ul>
          <li>
            Scanned PNG glyphs work best with high-contrast images (black ink on white paper, no
            shadows, no skew). Higher resolution gives cleaner segmentation.
          </li>
          <li>
            SVG editing is ideal for clean, scalable outlines and precise corrections (existing SVG
            glyphs can be loaded and modified). PNG editing in the canvas is for drawing new glyphs
            from scratch; scanned PNG glyphs are not editable in-place.
          </li>
          <li>
            For some languages, BeeFont requires digits and punctuation in addition to letters
            before allowing a font build. The missing-character view will tell you exactly what is
            still needed.
          </li>
          <li>
            Demo accounts are meant for exploration. Long-term work should be done with a regular
            account so that jobs and fonts are not discarded.
          </li>
        </ul>
      </section>
    </div>
  );
};

export default Home;
