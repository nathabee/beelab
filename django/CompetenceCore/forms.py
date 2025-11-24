# forms.py
from django import forms
from django.utils.safestring import mark_safe

from django.utils.html import format_html
from .models import  GroupageData , MyImage

 



class GroupageDataForm(forms.ModelForm):
    class Meta:
        model = GroupageData
        fields = '__all__'  # Adjust this as needed

 

class ImagePreviewWidget(forms.ClearableFileInput):
    """Custom Widget to display image preview in the form and show selected image."""

    template_name = 'widgets/image_preview_widget.html'

    def format_value(self, value):
        """Format the value to ensure it can be used in the template."""
        return value

    def render(self, name, value, attrs=None, renderer=None):
        # Default file input widget rendering
        input_html = super().render(name, value, attrs, renderer)

        # Check if an existing image is present and display the preview
        old_image_html = ''
        if value and hasattr(value, "url"):
            old_image_html = format_html(
                '<label for="{}">Current image preview:</label><br>'
                '<img id="old-image-preview" src="{}"  style="max-height: 200px; max-width: 100%; height: auto; width: auto; object-fit: contain;" alt="Current image preview"><br>',
                attrs.get('id'), value.url
            )

        # Add the JavaScript for live preview functionality
        script = '''
        <script type="text/javascript">
            document.getElementById("{0}").onchange = function(event) {{
                var reader = new FileReader();
                reader.onload = function(e) {{
                    // Create a new preview image if none exists
                    var newPreview = document.getElementById('new-image-preview');
                    if (!newPreview) {{
                        newPreview = document.createElement('img');
                        newPreview.id = 'new-image-preview';
                        newPreview.style.maxHeight = '200px';
                        event.target.parentElement.insertBefore(newPreview, event.target);
                    }}
                    // Update the image source with the selected file data
                    newPreview.src = e.target.result;
                }};
                // Read the selected file (this will trigger the onload function)
                reader.readAsDataURL(event.target.files[0]);
            }};
        </script>
        '''.format(attrs.get('id'))

        # Render image previews and file input field with JavaScript for live preview
        return mark_safe(f'{old_image_html}<br>{input_html}<br>{script}')