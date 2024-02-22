import Multiple from "../views/multiple/index.vue";
import ScreenShare from "../views/screenShare/index.vue";

export default [
  {
    path: "/multiple",
    name: "multiple",
    component: Multiple,
  },
  {
    path: "/screenShare",
    name: "screenShare",
    component: ScreenShare,
  },
];
