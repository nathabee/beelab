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
          BeeFont lets you turn hand-drawn letters into real font files (TTF). You print a template,
          draw your alphabet by hand, scan the pages, and BeeFont analyses each cell to extract the
          glyphs. You can then review, adjust, and finally build a downloadable font.
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
            <strong>Create a BeeFont job</strong>  
            Define a language (for example DE, EN, FR) and a template set. This job groups all your
            pages, glyphs and builds.
          </li>
          <li className="mb-2">
            <strong>Print template pages</strong>  
            BeeFont provides ready-made layouts (A4 grids) with one slot per character to fill in.
          </li>
          <li className="mb-2">
            <strong>Draw your letters by hand</strong>  
            Use a dark pen and keep letters roughly centred in each cell to help the segmentation.
          </li>
          <li className="mb-2">
            <strong>Scan and upload</strong>  
            Scan the filled templates and upload them on the <em>Print / Upload</em> page. BeeFont
            runs automatic analysis to detect and crop the glyphs from the grid.
          </li>
          <li className="mb-2">
            <strong>Review glyphs</strong>  
            On the glyph browser you can inspect what the system extracted per character, pick the
            best variant, or re-scan specific letters if needed.
          </li>
          <li className="mb-2">
            <strong>Check missing characters</strong>  
            The language status view shows which required characters are covered and which are still
            missing for a complete font.
          </li>
          <li className="mb-2">
            <strong>Build and download the font</strong>  
            Once all required glyphs are present, you can trigger a font build. The backend
            generates a TTF (and optionally a bundle) that you can download and install on your
            system.
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
                to see all your jobs and their status.
              </li>
              <li>
                Start a new job and then visit{' '}
                <Link to="/printupload">
                  Print / Upload
                </Link>{' '}
                to upload scanned template pages.
              </li>
              <li>
                Use the{' '}
                <Link to="/glyphbrowser">
                  glyph browser
                </Link>{' '}
                to inspect and fine-tune extracted glyphs.
              </li>
              <li>
                Open{' '}
                <Link to="/missingcharacters">
                  missing characters
                </Link>{' '}
                to see which glyphs are still required for a complete font.
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
            Glyph extraction works best with high-contrast scans (black ink on white paper, no
            shadows, no skew).
          </li>
          <li>
            For some languages, BeeFont requires digits and punctuation in addition to letters
            before allowing a font build.
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
