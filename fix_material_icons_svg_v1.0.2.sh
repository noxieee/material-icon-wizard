#!/usr/bin/env sh

for file in *.svg; do
  [ -f "$file" ] || continue

  perl -0777 -i -pe '
    # ---- SVG TAG: normalize fill to "none" only ----
    s{
      <svg\b([^>]*)>
    }{
      my $attrs = $1;

      if ($attrs =~ /\bfill\s*=/i) {
        $attrs =~ s/\bfill\s*=\s*"[^"]*"/fill="none"/i;
      } else {
        $attrs .= " fill=\"none\"";
      }

      "<svg$attrs>";
    }xge;

    # ---- PATH TAGS ----
    s{
      <path\b([^>]*?)(\s*\/?)>
    }{
      my ($attrs, $closing) = ($1, $2);

      # If fill="none" → leave unchanged
      if ($attrs =~ /\bfill\s*=\s*"none"/i) {
        "<path$attrs$closing>";
      }
      else {
        # Remove any other fill
        $attrs =~ s/\s*\bfill\s*=\s*"[^"]*"//gi;
        "<path$attrs fill=\"currentColor\"$closing>";
      }
    }xge;
  ' "$file"
done
