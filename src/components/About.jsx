import React from "react";
import { Box, Card, CardContent, Typography, Divider } from "@mui/material";

export default function About() {
  return (
    <Box sx={{ minHeight: "100vh", py: { xs: 2, sm: 6 }, px: { xs: 1, sm: 0 }, background: { xs: '#0f172a', sm: 'none' } }}>
      <Card sx={{ maxWidth: 700, mx: "auto", p: { xs: 2, sm: 4 }, background: "#0f172a", border: "1px solid rgba(148,163,184,0.15)", boxShadow: "0 8px 32px 0 rgba(36,59,85,0.12)", borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h4" align="center" sx={{ fontWeight: 800, background: "linear-gradient(to right, #292ce4, #0e85bc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", mb: 3 }}>
            About This Website
          </Typography>
          <Typography sx={{ color: '#26282a', fontSize: { xs: 15, sm: 17 }, mb: 3 }}>
            This platform provides a modern, mobile-friendly interface for viewing VTU results, toppers, and analytics. It is designed for students, teachers, and administrators to easily access and analyze academic performance data. The site features responsive navigation, secure admin/teacher access, and a smooth user experience on all devices.
          </Typography>
          <Divider sx={{ my: 3, borderColor: '#334155' }} />
          <Typography variant="h5" align="center" sx={{ fontWeight: 700, color: '#ffb300', mb: 2 }}>
            About the Developer
          </Typography>
          <Typography sx={{ color: '#2d3034', fontSize: { xs: 15, sm: 17 } }}>
            Developed by <b>Akash Patil</b>, a passionate web developer and engineer. Akash specializes in building robust, user-centric web applications with a focus on performance and accessibility. For feedback or collaboration, connect at <a href="mailto:akashpatil147@gmail.com" style={{ color: '#38bdf8' }}>akashpatil147@gmail.com</a>.
          </Typography>
        </CardContent>
      </Card>
      <Typography align="center" sx={{ color: '#64748b', fontSize: 14, mt: 3 }}>
        © {new Date().getFullYear()} Build
      </Typography>
    </Box>
  );
}
