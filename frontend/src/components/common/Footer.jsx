import React from "react";

const Footer = () => {
  return (
    <footer className="bg-dark-100 border-t border-white/10 py-4">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <p className="text-sm text-gray-400">
          © {new Date().getFullYear()} Osittech Contribution. All rights
          reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
