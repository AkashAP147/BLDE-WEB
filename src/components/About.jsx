import React from "react";
import { Box, Card, CardContent, Typography, Divider } from "@mui/material";
import logo from "../assets/bldeacet-logo.webp";

export default function About() {
  return (
    <Box sx={{ minHeight: "100vh", py: { xs: 2, sm: 6 }, px: { xs: 1, sm: 0 }, background: { xs: '#f0f4f8', sm: 'none' } }}>
      <Card sx={{ maxWidth: 700, mx: "auto", p: { xs: 2, sm: 4 }, background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 4px 24px rgba(0,0,0,0.06)", borderRadius: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="center" mb={2}>
            <img src={logo} alt="BLDEACET Logo" style={{ height: 70, width: 'auto' }} />
          </Box>
          <Typography variant="h4" align="center" sx={{ fontWeight: 900, color: '#0f172a', mb: 3 }}>
            About This Website
          </Typography>
          <Typography sx={{ color: '#475569', fontSize: { xs: 15, sm: 17 }, mb: 3, textAlign: 'justify' }}>
            This platform provides a modern, mobile-friendly interface for viewing VTU results, toppers, and analytics. It is designed for students, teachers, and administrators to easily access and analyze academic performance data. The site features responsive navigation, secure admin/teacher access, and a smooth user experience on all devices.
          </Typography>
          <Divider sx={{ my: 3, borderColor: '#e2e8f0' }} />
          <Typography variant="h5" align="center" sx={{ fontWeight: 800, color: '#0f172a', mb: 2 }}>
            About the Developer
          </Typography>
          <Typography sx={{ color: '#475569', fontSize: { xs: 15, sm: 17 }, mb: 2, textAlign: 'justify' }}>
            Developed by <b>Akash Patil</b>, a passionate web developer and engineer. Akash specializes in building robust, user-centric web applications with a focus on performance and accessibility. For feedback or collaboration, connect at <a href="mailto:akashpatil147@gmail.com" style={{ color: '#0f172a', fontWeight: 700 }}>akashscience147@gmail.com</a>.<br /><br />
            For community outreach and networking, connect with <b>Khajesaheb Walikar</b> at <a href="mailto:swalikarsaddam@gmail.com" style={{ color: '#0f172a', fontWeight: 700 }}>swalikarsaddam@gmail.com</a>.
          </Typography>

<Divider sx={{ my: 2, borderColor: '#e2e8f0' }} />
          <Typography variant="h6" align="center" sx={{ fontWeight: 800, color: '#0f172a', mb: 1 }}>
            In Collaboration With
          </Typography>
          <Typography align="center" sx={{ color: '#475569', fontSize: { xs: 15, sm: 17 }, mb: 2 }}>
            <b>Nayan Arakeri</b>
          </Typography>
        </CardContent>
      </Card>
      <Typography align="center" sx={{ color: '#64748b', fontSize: 14, mt: 3 }}>
        &copy; {new Date().getFullYear()} Build
      </Typography>
    </Box>
  );
}
