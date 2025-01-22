// components/Layout.js

import React from 'react';
import Link from 'next/link';
import 'bootstrap/dist/css/bootstrap.min.css';

const Navbar = () => {
    return (
        <div>
            <nav className="navbar navbar-expand-lg 
                            navbar-light bg-dark 
                            bg-opacity-75 text-light">
                <div className="container">
                    <Link className="navbar-brand 
                                    text-light font-bold"
                        href="/">
                        GFG
                    </Link>
                    <div className="collapse navbar-collapse"
                        id="navbarNav">
                        <ul className="navbar-nav mr-auto">
                            <li className="nav-item">
                                <Link href="/about"
                                    className="nav-item nav-link 
                                                 text-light">
                                    Abou
                                </Link>
                            </li>
                            <li className="nav-item">
                                <Link href="/Contact"
                                    className="nav-item nav-link 
                                                 text-light">
                                    Contact
                                </Link>
                            </li>
                            <li className="nav-item">
                                <Link href="services"
                                    className="nav-item nav-link 
                                                text-light">
                                    Sevices
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>
            </nav>
        </div>
    );
};

export default Navbar;