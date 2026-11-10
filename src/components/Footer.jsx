import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-container">
        <p>© 2026 5.55 Client. All rights reserved.</p>
        <div className="footer-links">
          <Link to="/terms" className="footer-link">
            Terms of Service
          </Link>
          <Link to="/privacy" className="footer-link">
            Privacy Policy
          </Link>
          <Link to="/refund" className="footer-link">
            Refund Policy
          </Link>
          <Link to="/affiliates" className="footer-link">
            Affiliates
          </Link>
          <Link to="/changelog" className="footer-link">
            Changelog
          </Link>
          <Link to="/status" className="footer-link">
            Status
          </Link>
          <a
            href="https://discord.gg/xx7Ns6vW8"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            Discord
          </a>
        </div>
      </div>
    </footer>
  );
}
