import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { useSidebar } from "../../contexts/SidebarContext";

const FONT_SIZES = ["12", "14", "16", "18", "20", "24", "28", "32", "36", "48", "64"];
const SAVE_DELAY = 2000;
