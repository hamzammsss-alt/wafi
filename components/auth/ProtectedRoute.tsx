import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { authService } from '../../services/authService';

export const ProtectedRoute: React.FC = () => {
    // Use the comprehensive check from authService
    const isAuth = authService.isAuthenticated();

    if (!isAuth) {
        // If no user, redirect to login
        // replace: true ensures the login page replaces the current history entry,
        // so hitting "Back" won't take them back to the protected route they were denied access to.
        return <Navigate to="/system/login" replace />;
    }

    // If user exists, render the child routes (MainLayout)
    return <Outlet />;
};
