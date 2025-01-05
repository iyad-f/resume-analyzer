import Link from "next/link";
import Image from "next/image";
import React from "react";

const Navbar = () => {
  return (
    <header className="px-5 py-3 shadow-sm border-b-[0.1px] border-gray-700">
      <nav className="flex justify-between items-center">
        <Link href="/" className="flex gap-1 items-center">
          <Image src="/logo.png" alt="logo" width={70} height={20} />
          <span className="text-2xl font-bold">Resume Analyzer</span>
        </Link>
      </nav>
    </header>
  );
};

export default Navbar;
