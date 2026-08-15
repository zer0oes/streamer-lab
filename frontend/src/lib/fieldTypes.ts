export const FIELD_TYPE_ICON: Record<string, string> = {
  dropdown: "list",
  colorpicker: "palette",
  slider: "tune",
  googleFont: "font_download",
  fontpicker: "font_download",
  textfield: "text_fields",
  text: "text_fields",
  imagepicker: "image",
  soundpicker: "music_note",
  videopicker: "videocam",
  number: "numbers",
  checkbox: "check_box",
  button: "smart_button"
};

// Types dont l'input tient raisonnablement à côté du libellé sur une seule
// ligne (panneau étroit) : les autres gardent leur input en pleine largeur.
export const FIELD_INLINE_TYPES = new Set(["number", "colorpicker", "dropdown"]);

const INPUT_TYPE_BY_FIELD_TYPE: Record<string, string> = {
  colorpicker: "color",
  slider: "range",
  googleFont: "text",
  fontpicker: "text",
  textfield: "text",
  imagepicker: "url",
  soundpicker: "url",
  videopicker: "url"
};

export function fieldTypeIcon(type: string): string {
  return FIELD_TYPE_ICON[type] || "tune";
}

export function resolveInputType(type: string): string {
  return INPUT_TYPE_BY_FIELD_TYPE[type] || (["number", "text"].includes(type) ? type : "url");
}
